const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database/db');
const sessionManager = require('../baileys/sessionManager');

// Multer storage configuration for uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const subfolder = req.query.type || 'uploads';
    const uploadPath = path.join(__dirname, '..', '..', 'public', 'uploads', subfolder);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '';
    const safeName = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// --- SESSIONS & DASHBOARD STATUS ---
router.get('/status', (req, res) => {
  try {
    const sessions = sessionManager.getAllSessionsStatus();
    const stats = db.getAllNumbersStats();
    
    // Merge stats with runtime session statuses
    const merged = sessions.map(s => {
      const stat = stats.find(st => st.id === s.id) || {};
      return {
        ...s,
        contactCount: stat.contactCount || 0,
        unreadCount: stat.unreadCount || 0,
        archiveCount: stat.archiveCount || 0
      };
    });

    const onlineCount = merged.filter(s => s.status === 'connected').length;

    res.json({
      success: true,
      totalNumbers: 10,
      onlineCount,
      allOnline: onlineCount === 10,
      numbers: merged
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/sessions/:id/connect', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await sessionManager.connect(id);
    res.json({ success: true, message: `Connection initiated for ${id}`, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/sessions/:id/logout', async (req, res) => {


router.post('/sessions/:id/clear', (req, res) => {
  try {
    const { id } = req.params;
    db.clearSessionData(id);
    if (sessionManager.io) {
      sessionManager.io.emit('session_cleared', { sessionId: id });
      sessionManager.io.emit('stats_update', db.getAllNumbersStats());
    }
    res.json({ success: true, message: `All chats and contacts cleared for ${id}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
  try {
    const { id } = req.params;
    const result = await sessionManager.logout(id);
    res.json({ success: true, message: `Logged out from ${id}`, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- STATS FOR SELECTED NUMBER ---
router.get('/stats/:waNumberId', (req, res) => {
  try {
    const { waNumberId } = req.params;
    const stats = db.getStatsForNumber(waNumberId);
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- CONTACTS ---
router.get('/contacts', (req, res) => {
  try {
    const waNumberId = req.query.wa_number_id || 'WA-1';
    const filter = req.query.filter || 'all'; // 'all' | 'unread' | 'archive'
    // If session has no credentials and is not connected, it is unlinked
    const isLinked = sessionManager.hasCredentials(waNumberId) || sessionManager.sessions.get(waNumberId)?.status === 'connected';
    if (!isLinked) {
      db.clearSessionData(waNumberId);
      return res.json({
        success: true,
        waNumberId,
        filter,
        stats: { contactCount: 0, unreadCount: 0, archiveCount: 0 },
        contacts: []
      });
    }

    const contacts = db.getContacts(waNumberId, filter);
    const stats = db.getStatsForNumber(waNumberId);

    res.json({
      success: true,
      waNumberId,
      filter,
      stats,
      contacts
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- MESSAGES ---
router.get('/messages', (req, res) => {
  try {
    const waNumberId = req.query.wa_number_id;
    const customerJid = req.query.customer_jid;

    if (!waNumberId || !customerJid) {
      return res.status(400).json({ success: false, error: 'wa_number_id and customer_jid are required' });
    }

    const isLinked = sessionManager.hasCredentials(waNumberId) || sessionManager.sessions.get(waNumberId)?.status === 'connected';
    if (!isLinked) {
      return res.json({ success: true, messages: [] });
    }

    const messages = db.getMessages(waNumberId, customerJid);
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/messages/send', async (req, res) => {
  try {
    const { wa_number_id, customer_jid, text } = req.body;
    if (!wa_number_id || !customer_jid || !text) {
      return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }

    const saved = await sessionManager.sendTextMessage(wa_number_id, customer_jid, text);
    res.json({ success: true, message: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/messages/send-media', upload.single('file'), async (req, res) => {
  try {
    const { wa_number_id, customer_jid, type, caption } = req.body;
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No media file uploaded' });
    }

    const relativeUrl = `/uploads/${req.query.type || 'uploads'}/${req.file.filename}`;
    const mediaItem = {
      type: type || 'image',
      url: relativeUrl,
      caption: caption || '',
      name: req.file.originalname,
      mimetype: req.file.mimetype
    };

    const saved = await sessionManager.sendMediaItem(wa_number_id, customer_jid, mediaItem);
    res.json({ success: true, message: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/messages/quick-reply', async (req, res) => {
  try {
    const { wa_number_id, customer_jid, templateId } = req.body;
    if (!wa_number_id || !customer_jid || !templateId) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const sentItems = await sessionManager.sendQuickReply(wa_number_id, customer_jid, templateId);
    res.json({ success: true, sentCount: sentItems.length, messages: sentItems });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/chats/read', (req, res) => {
  try {
    const { wa_number_id, customer_jid } = req.body;
    const contact = db.markChatAsRead(wa_number_id, customer_jid);
    res.json({ success: true, contact });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/chats/archive', (req, res) => {
  try {
    const { wa_number_id, customer_jid, isArchived } = req.body;
    const contact = db.toggleArchiveChat(wa_number_id, customer_jid, isArchived);
    res.json({ success: true, contact });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/chats', (req, res) => {
  try {
    const wa_number_id = req.body.wa_number_id || req.query.wa_number_id;
    const customer_jid = req.body.customer_jid || req.query.customer_jid;

    if (!wa_number_id || !customer_jid) {
      return res.status(400).json({ success: false, error: 'wa_number_id and customer_jid are required' });
    }

    db.deleteContactAndChats(wa_number_id, customer_jid);
    
    // Emit stats update
    if (sessionManager.io) {
      sessionManager.io.emit('stats_update', db.getAllNumbersStats());
    }

    const stats = db.getStatsForNumber(wa_number_id);
    res.json({ success: true, message: 'Chat and messages deleted successfully', stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/contacts/new', async (req, res) => {
  try {
    const { wa_number_id, phone, name, initialMessage } = req.body;
    if (!wa_number_id || !phone) {
      return res.status(400).json({ success: false, error: 'wa_number_id and phone are required' });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const jid = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;
    const contactName = (name && name.trim()) || `+${cleanPhone}`;

    const contact = db.upsertContact(wa_number_id, jid, {
      name: contactName,
      phone: `+${cleanPhone}`,
      unreadCount: 0,
      is_archived: false,
      lastMessage: initialMessage || 'Chat started',
      lastMessageTime: Date.now()
    });

    if (initialMessage && initialMessage.trim()) {
      await sessionManager.sendTextMessage(wa_number_id, jid, initialMessage.trim());
    }

    if (sessionManager.io) {
      sessionManager.io.emit('stats_update', db.getAllNumbersStats());
    }

    res.json({ success: true, contact });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// --- QUICK REPLIES CRUD ---
router.get('/quick-replies', (req, res) => {
  try {
    const list = db.getQuickReplies();
    res.json({ success: true, quickReplies: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/quick-replies', (req, res) => {
  try {
    const template = req.body;
    if (!template.name) {
      return res.status(400).json({ success: false, error: 'Quick reply shortcut name is required (e.g. /cars)' });
    }
    const saved = db.saveQuickReply(template);
    res.json({ success: true, quickReply: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/quick-replies/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.deleteQuickReply(id);
    res.json({ success: true, message: `Quick reply ${id} deleted` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// File upload for Quick Replies or Voice Recording
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file received' });
    }
    const subfolder = req.query.type || 'uploads';
    const relativeUrl = `/uploads/${subfolder}/${req.file.filename}`;
    res.json({
      success: true,
      file: {
        name: req.file.originalname,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: relativeUrl
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- AUTO REPLIES CONFIGURATION ---
router.get('/auto-replies', (req, res) => {
  try {
    const configs = db.getAutoReplies();
    res.json({ success: true, autoReplies: configs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/auto-replies/:waNumberId', (req, res) => {
  try {
    const { waNumberId } = req.params;
    const config = db.getAutoReplyForNumber(waNumberId);
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/auto-replies/:waNumberId', (req, res) => {
  try {
    const { waNumberId } = req.params;
    const updated = db.updateAutoReply(waNumberId, req.body);
    res.json({ success: true, config: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
