const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode');
const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const db = require('../database/db');

const SESSIONS_DIR = path.join(__dirname, '..', '..', 'sessions');
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'public', 'uploads');

// Ensure directories
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

class SessionManager {
  constructor() {
    this.sessions = new Map(); // id -> { sock, qr, status, retryCount }
    this.io = null;
    this.autoReplyCooldowns = new Map(); // key `${waId}_${jid}` -> timestamp
  }

  setSocketIO(io) {
    this.io = io;
  }

  emitSessionUpdate(sessionId, data) {
    if (this.io) {
      this.io.emit('session_update', { sessionId, ...data });
    }
  }

  emitNewMessage(sessionId, message) {
    if (this.io) {
      this.io.emit('new_message', { sessionId, message });
      this.io.emit('stats_update', db.getAllNumbersStats());
    }
  }

  getSession(id) {
    return this.sessions.get(id);
  }

  getAllSessionsStatus() {
    const all = db.getSessionsMeta();
    return all.map(s => {
      const active = this.sessions.get(s.id);
      const credsPath = path.join(SESSIONS_DIR, s.id, 'creds.json');
      const hasCreds = fs.existsSync(credsPath);

      // Determine true status
      let realStatus = 'disconnected';
      if (active?.status) {
        realStatus = active.status;
      } else if (hasCreds) {
        realStatus = 'disconnected';
      }

      return {
        ...s,
        status: realStatus,
        qr: active?.qr || null,
        phone: active?.phone || (hasCreds ? s.phone : null),
        pushName: active?.pushName || (hasCreds ? s.pushName : null)
      };
    });
  }

  async initAllSessions() {
    const list = db.getSessionsMeta();
    for (const item of list) {
      const sessionPath = path.join(SESSIONS_DIR, item.id);
      const credsPath = path.join(sessionPath, 'creds.json');
      if (fs.existsSync(credsPath)) {
        console.log(`[Baileys] Found existing credentials for ${item.id}. Restoring connection...`);
        this.connect(item.id).catch(err => {
          console.error(`[Baileys] Error auto-connecting ${item.id}:`, err.message);
        });
      }
    }
  }

  async connect(sessionId) {
    const sessionPath = path.join(SESSIONS_DIR, sessionId);
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }

    // If socket already connected or connecting
    const existing = this.sessions.get(sessionId);
    if (existing && existing.sock && existing.status === 'connected') {
      return { success: true, message: 'Already connected', status: 'connected' };
    }

    try {
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
      const { version } = await fetchLatestBaileysVersion();

      const logger = pino({ level: 'silent' });

      const sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: false,
        auth: state,
        browser: ['WA MANAGER PRO', 'Chrome', '124.0.0.0'],
        syncFullHistory: true, // Enables full history sync from phone
        generateHighQualityLinkPreview: true,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 15000,
        emitOwnEvents: true,
        getMessage: async () => ({ conversation: 'WA Manager Pro' })
      });

      this.sessions.set(sessionId, {
        sock,
        qr: null,
        status: 'connecting',
        retryCount: 0
      });

      db.updateSessionMeta(sessionId, { status: 'connecting', qr: null });
      this.emitSessionUpdate(sessionId, { status: 'connecting', qr: null });

      // Save credentials whenever updated
      sock.ev.on('creds.update', saveCreds);

      // Connection update handler
      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            const qrDataUrl = await qrcode.toDataURL(qr, { margin: 2, scale: 7 });
            const s = this.sessions.get(sessionId) || {};
            s.qr = qrDataUrl;
            s.status = 'qr_ready';
            this.sessions.set(sessionId, s);

            db.updateSessionMeta(sessionId, { status: 'qr_ready', qr: qrDataUrl });
            this.emitSessionUpdate(sessionId, { status: 'qr_ready', qr: qrDataUrl });
          } catch (qrErr) {
            console.error(`[Baileys] QR Generation error for ${sessionId}:`, qrErr);
          }
        }

        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          console.log(`[Baileys] Session ${sessionId} connection closed. Code: ${statusCode}, Reconnect: ${shouldReconnect}`);

          const sessionObj = this.sessions.get(sessionId);
          if (sessionObj) {
            sessionObj.status = 'disconnected';
            sessionObj.qr = null;
          }

          if (shouldReconnect) {
            const retries = (sessionObj?.retryCount || 0) + 1;
            if (sessionObj) sessionObj.retryCount = retries;
            const delay = Math.min(retries * 3000, 15000);

            console.log(`[Baileys] Reconnecting ${sessionId} in ${delay}ms (Attempt #${retries})...`);
            db.updateSessionMeta(sessionId, { status: 'reconnecting', qr: null });
            this.emitSessionUpdate(sessionId, { status: 'reconnecting', qr: null });

            setTimeout(() => {
              this.connect(sessionId).catch(err => {
                console.error(`[Baileys] Reconnect failed for ${sessionId}:`, err.message);
              });
            }, delay);
          } else {
            console.log(`[Baileys] Logged out from ${sessionId}. Clearing credentials.`);
            this.sessions.delete(sessionId);
            this.clearSessionFiles(sessionId);

            db.updateSessionMeta(sessionId, {
              status: 'disconnected',
              phone: null,
              pushName: null,
              qr: null
            });
            this.emitSessionUpdate(sessionId, {
              status: 'disconnected',
              phone: null,
              pushName: null,
              qr: null
            });
          }
        } else if (connection === 'open') {
          console.log(`[Baileys] Session ${sessionId} successfully connected!`);
          const phoneRaw = sock.user?.id ? sock.user.id.split(':')[0] : null;
          const pushName = sock.user?.name || `WA User (${phoneRaw || sessionId})`;

          const s = this.sessions.get(sessionId) || {};
          s.status = 'connected';
          s.qr = null;
          s.phone = phoneRaw;
          s.pushName = pushName;
          s.retryCount = 0;
          this.sessions.set(sessionId, s);

          db.updateSessionMeta(sessionId, {
            status: 'connected',
            phone: phoneRaw,
            pushName: pushName,
            qr: null
          });

          this.emitSessionUpdate(sessionId, {
            status: 'connected',
            phone: phoneRaw,
            pushName: pushName,
            qr: null
          });

          setTimeout(() => {
            this.enrichContacts(sessionId).catch(e => console.warn('Enrichment notice:', e.message));
          }, 1500);
        }
      });

      // 1. Messaging History Sync (Existing contacts, chats, messages from WhatsApp phone)
      sock.ev.on('messaging-history.set', async ({ chats, contacts, messages }) => {
        console.log(`[Baileys] History synced for ${sessionId}: ${chats?.length || 0} chats, ${contacts?.length || 0} contacts, ${messages?.length || 0} messages`);

        if (contacts && contacts.length > 0) {
          for (const c of contacts) {
            if (c.id && !c.id.includes('@broadcast')) {
              db.upsertContact(sessionId, c.id, {
                name: c.name || c.notify || c.verifiedName || c.id.replace(/@.*$/, ''),
                phone: c.id.replace(/@.*$/, '')
              });
            }
          }
        }

        if (chats && chats.length > 0) {
          for (const ch of chats) {
            if (ch.id && !ch.id.includes('@broadcast')) {
              db.upsertContact(sessionId, ch.id, {
                name: ch.name || ch.id.replace(/@.*$/, ''),
                phone: ch.id.replace(/@.*$/, ''),
                unreadCount: ch.unreadCount || 0,
                is_archived: Boolean(ch.archived)
              });
            }
          }
        }

        if (messages && messages.length > 0) {
          for (const msg of messages) {
            try {
              await this.handleIncomingMessage(sessionId, sock, msg, false);
            } catch (err) {
              // ignore single message parsing issues
            }
          }
        }

        if (this.io) {
          this.io.emit('stats_update', db.getAllNumbersStats());
          this.io.emit('session_update', { sessionId, status: 'connected' });
        }
      });

      // 2. Real-time contacts update
      sock.ev.on('contacts.upsert', (contacts) => {
        for (const c of contacts) {
          if (c.id && !c.id.includes('@broadcast')) {
            db.upsertContact(sessionId, c.id, {
              name: c.name || c.notify || c.verifiedName || c.id.replace(/@.*$/, ''),
              phone: c.id.replace(/@.*$/, '')
            });
          }
        }
      });

      // 3. Real-time chats update
      sock.ev.on('chats.upsert', (newChats) => {
        for (const ch of newChats) {
          if (ch.id && !ch.id.includes('@broadcast')) {
            db.upsertContact(sessionId, ch.id, {
              name: ch.name || ch.id.replace(/@.*$/, ''),
              phone: ch.id.replace(/@.*$/, ''),
              unreadCount: ch.unreadCount || 0,
              is_archived: Boolean(ch.archived)
            });
          }
        }
        if (this.io) {
          this.io.emit('stats_update', db.getAllNumbersStats());
        }
      });

      // 4. Messages handler (live incoming & appended messages)
      sock.ev.on('messages.upsert', async ({ messages, type }) => {
        const isLive = type === 'notify';
        for (const msg of messages) {
          try {
            await this.handleIncomingMessage(sessionId, sock, msg, isLive);
          } catch (mErr) {
            console.error(`[Baileys] Error handling message on ${sessionId}:`, mErr);
          }
        }
      });

      return { success: true, message: 'Connection initiated', status: 'connecting' };
    } catch (err) {
      console.error(`[Baileys] Error connecting ${sessionId}:`, err);
      db.updateSessionMeta(sessionId, { status: 'error', error: err.message });
      this.emitSessionUpdate(sessionId, { status: 'error', error: err.message });
      throw err;
    }
  }

  async logout(sessionId) {
    try {
      const session = this.sessions.get(sessionId);
      if (session && session.sock) {
        try {
          await session.sock.logout();
        } catch (e) {
          console.warn(`[Baileys] Logout socket warning for ${sessionId}:`, e.message);
        }
      }
      this.sessions.delete(sessionId);
      this.clearSessionFiles(sessionId);

      db.updateSessionMeta(sessionId, {
        status: 'disconnected',
        phone: null,
        pushName: null,
        qr: null
      });

      this.emitSessionUpdate(sessionId, {
        status: 'disconnected',
        phone: null,
        pushName: null,
        qr: null
      });

      return { success: true, message: `Session ${sessionId} logged out successfully` };
    } catch (err) {
      console.error(`[Baileys] Error logging out ${sessionId}:`, err);
      throw err;
    }
  }

  clearSessionFiles(sessionId) {
    const sessionPath = path.join(SESSIONS_DIR, sessionId);
    if (fs.existsSync(sessionPath)) {
      try {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        fs.mkdirSync(sessionPath, { recursive: true });
      } catch (e) {
        console.error(`Error deleting session directory for ${sessionId}:`, e);
      }
    }
  }

  async handleIncomingMessage(sessionId, sock, rawMsg, allowAutoReply = true) {
    if (!rawMsg.message) return;
    const key = rawMsg.key;
    const remoteJid = key.remoteJid;

    // Ignore broadcast and status updates
    if (!remoteJid || remoteJid === 'status@broadcast' || remoteJid.includes('@broadcast')) {
      return;
    }

    const fromMe = key.fromMe;

    // Unwrap ephemeral or viewOnce wrappers
    let messageContent = rawMsg.message;
    if (messageContent.ephemeralMessage?.message) messageContent = messageContent.ephemeralMessage.message;
    if (messageContent.viewOnceMessage?.message) messageContent = messageContent.viewOnceMessage.message;
    if (messageContent.viewOnceMessageV2?.message) messageContent = messageContent.viewOnceMessageV2.message;
    if (messageContent.documentWithCaptionMessage?.message) messageContent = messageContent.documentWithCaptionMessage.message;

    const pushName = rawMsg.pushName || remoteJid.replace(/@.*$/, '');

    // Extract text & media details
    let text = '';
    let msgType = 'text';
    let mediaUrl = null;
    let audioUrl = null;
    let videoUrl = null;
    let fileName = null;

    if (messageContent.conversation) {
      text = messageContent.conversation;
    } else if (messageContent.extendedTextMessage) {
      text = messageContent.extendedTextMessage.text || '';
    } else if (messageContent.imageMessage) {
      msgType = 'image';
      text = messageContent.imageMessage.caption || '';
    } else if (messageContent.videoMessage) {
      msgType = 'video';
      text = messageContent.videoMessage.caption || '';
    } else if (messageContent.audioMessage) {
      msgType = 'audio';
    } else if (messageContent.documentMessage) {
      msgType = 'document';
      fileName = messageContent.documentMessage.fileName || 'Document';
      text = fileName;
    } else if (messageContent.protocolMessage) {
      return; // ignore protocol messages
    }

    const savedMsg = db.saveMessage({
      id: key.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      wa_number_id: sessionId,
      customer_jid: remoteJid,
      fromMe: Boolean(fromMe),
      type: msgType,
      text: text,
      fileName,
      mediaUrl,
      audioUrl,
      videoUrl,
      timestamp: rawMsg.messageTimestamp ? Number(rawMsg.messageTimestamp) * 1000 : Date.now(),
      status: fromMe ? 'sent' : 'delivered'
    });

    // Update customer name in contacts if available
    if (pushName) {
      db.upsertContact(sessionId, remoteJid, {
        name: pushName,
        phone: remoteJid.replace(/@.*$/, '')
      });
    }

    this.emitNewMessage(sessionId, savedMsg);

    // Process Auto-Reply only for incoming messages from customers
    if (allowAutoReply && !fromMe && !remoteJid.endsWith('@g.us')) {
      await this.processAutoReply(sessionId, sock, remoteJid, text);
    }
  }

  // --- AUTO REPLY EVALUATOR & DISPATCHER ---
  async processAutoReply(sessionId, sock, customerJid, incomingText) {
    const config = db.getAutoReplyForNumber(sessionId);
    if (!config || !config.enabled) return;

    // Check cooldown
    const cooldownKey = `${sessionId}_${customerJid}`;
    const lastTrigger = this.autoReplyCooldowns.get(cooldownKey) || 0;
    const cooldownMs = (config.cooldownMinutes || 15) * 60 * 1000;
    if (Date.now() - lastTrigger < cooldownMs) {
      console.log(`[AutoReply] Skipped for ${customerJid} (Cooldown active)`);
      return;
    }

    let shouldTrigger = false;

    if (config.triggerType === 'all') {
      shouldTrigger = true;
    } else if (config.triggerType === 'hours') {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const [startH, startM] = (config.businessHours?.start || '09:00').split(':').map(Number);
      const [endH, endM] = (config.businessHours?.end || '22:00').split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      const isInside = currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      if (!isInside) {
        shouldTrigger = true; // Outside business hours
      }
    } else if (config.triggerType === 'keywords') {
      const keywords = (config.keywords || []).map(k => k.trim().toLowerCase()).filter(Boolean);
      const lowerText = (incomingText || '').toLowerCase();
      if (keywords.some(k => lowerText.includes(k))) {
        shouldTrigger = true;
      }
    }

    if (!shouldTrigger) return;

    console.log(`[AutoReply] Triggered for ${customerJid} on ${sessionId}!`);
    this.autoReplyCooldowns.set(cooldownKey, Date.now());

    // Send auto reply items (Text + Rich Media)
    try {
      if (Array.isArray(config.media) && config.media.length > 0) {
        for (const item of config.media) {
          await this.sendMediaItem(sessionId, customerJid, item);
          await new Promise(r => setTimeout(r, 600));
        }
      }

      if (config.text && config.text.trim()) {
        await this.sendTextMessage(sessionId, customerJid, config.text);
      }
    } catch (arErr) {
      console.error(`[AutoReply] Error sending auto-reply to ${customerJid}:`, arErr);
    }
  }

  async enrichContacts(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.sock || session.status !== 'connected') return;
    const sock = session.sock;

    const contacts = db.getContacts(sessionId, 'all');
    console.log(`[Baileys] Starting enrichment for ${contacts.length} contacts on ${sessionId}...`);

    let anyUpdated = false;

    for (const contact of contacts) {
      let isUpdated = false;
      const updates = {};

      // 1. Group Subject Resolution
      if (contact.jid.endsWith('@g.us')) {
        updates.is_group = true;
        try {
          const meta = await sock.groupMetadata(contact.jid);
          if (meta?.subject && meta.subject !== contact.name) {
            updates.name = meta.subject;
            updates.phone = `${meta.participants?.length || 0} participants`;
            isUpdated = true;
          }
        } catch (e) {
          // ignore
        }
      }

      // 2. Profile Picture (DP) Resolution
      if (!contact.avatarUrl) {
        try {
          const dpUrl = await sock.profilePictureUrl(contact.jid, 'image');
          if (dpUrl) {
            updates.avatarUrl = dpUrl;
            isUpdated = true;
          }
        } catch (e) {
          // no dp or private
        }
      }

      if (isUpdated) {
        db.upsertContact(sessionId, contact.jid, updates);
        anyUpdated = true;
      }

      await new Promise(r => setTimeout(r, 80));
    }

    if (anyUpdated && this.io) {
      console.log(`[Baileys] Enrichment complete with updates for ${sessionId}`);
      this.io.emit('stats_update', db.getAllNumbersStats());
    }
  }

  // --- SENDING METHODS ---
  async sendTextMessage(sessionId, customerJid, text) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.sock || session.status !== 'connected') {
      const saved = db.saveMessage({
        wa_number_id: sessionId,
        customer_jid: customerJid,
        fromMe: true,
        type: 'text',
        text: text,
        timestamp: Date.now(),
        status: 'sent'
      });
      this.emitNewMessage(sessionId, saved);
      return saved;
    }

    try {
      const res = await session.sock.sendMessage(customerJid, { text });
      const saved = db.saveMessage({
        id: res?.key?.id,
        wa_number_id: sessionId,
        customer_jid: customerJid,
        fromMe: true,
        type: 'text',
        text: text,
        timestamp: Date.now(),
        status: 'sent'
      });
      this.emitNewMessage(sessionId, saved);
      return saved;
    } catch (err) {
      console.error(`[Baileys] Error sending text from ${sessionId}:`, err);
      throw err;
    }
  }

  async sendMediaItem(sessionId, customerJid, mediaItem) {
    const session = this.sessions.get(sessionId);
    const filePath = path.join(__dirname, '..', '..', 'public', mediaItem.url.replace(/^\//, ''));
    const isOnline = session && session.sock && session.status === 'connected';

    let payload = null;
    let savedMsgType = mediaItem.type || 'image';

    if (mediaItem.type === 'image') {
      payload = fs.existsSync(filePath)
        ? { image: fs.readFileSync(filePath), caption: mediaItem.caption || '' }
        : { image: { url: mediaItem.url }, caption: mediaItem.caption || '' };
    } else if (mediaItem.type === 'video') {
      payload = fs.existsSync(filePath)
        ? { video: fs.readFileSync(filePath), caption: mediaItem.caption || '' }
        : { video: { url: mediaItem.url }, caption: mediaItem.caption || '' };
    } else if (mediaItem.type === 'audio' || mediaItem.type === 'voice') {
      savedMsgType = 'audio';
      payload = fs.existsSync(filePath)
        ? { audio: fs.readFileSync(filePath), mimetype: 'audio/mp4', ptt: true }
        : { audio: { url: mediaItem.url }, mimetype: 'audio/mp4', ptt: true };
    } else if (mediaItem.type === 'document') {
      savedMsgType = 'document';
      payload = fs.existsSync(filePath)
        ? { document: fs.readFileSync(filePath), mimetype: mediaItem.mimetype || 'application/pdf', fileName: mediaItem.name || 'document.pdf' }
        : { document: { url: mediaItem.url }, mimetype: mediaItem.mimetype || 'application/pdf', fileName: mediaItem.name || 'document.pdf' };
    }

    if (isOnline && payload) {
      try {
        await session.sock.sendMessage(customerJid, payload);
      } catch (e) {
        console.warn(`[Baileys] Socket media send notice on ${sessionId}:`, e.message);
      }
    }

    const saved = db.saveMessage({
      wa_number_id: sessionId,
      customer_jid: customerJid,
      fromMe: true,
      type: savedMsgType,
      text: mediaItem.caption || mediaItem.name || '',
      mediaUrl: mediaItem.url,
      audioUrl: (savedMsgType === 'audio') ? mediaItem.url : null,
      videoUrl: (savedMsgType === 'video') ? mediaItem.url : null,
      timestamp: Date.now(),
      status: 'sent'
    });
    this.emitNewMessage(sessionId, saved);
    return saved;
  }

  // --- QUICK REPLY SEND ---
  async sendQuickReply(sessionId, customerJid, templateIdOrName) {
    const templates = db.getQuickReplies();
    const template = templates.find(t => t.id === templateIdOrName || t.name === templateIdOrName);
    if (!template) {
      throw new Error(`Quick reply template "${templateIdOrName}" not found`);
    }

    const sentItems = [];

    if (Array.isArray(template.media)) {
      for (const mediaItem of template.media) {
        const sent = await this.sendMediaItem(sessionId, customerJid, mediaItem);
        sentItems.push(sent);
        await new Promise(r => setTimeout(r, 500));
      }
    }

    if (template.text && template.text.trim()) {
      const sent = await this.sendTextMessage(sessionId, customerJid, template.text);
      sentItems.push(sent);
    }

    return sentItems;
  }
}

module.exports = new SessionManager();
