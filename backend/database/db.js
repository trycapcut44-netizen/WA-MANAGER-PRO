const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '..', '..', 'database');
const CHATS_FILE = path.join(DB_DIR, 'chats.json');
const CONTACTS_FILE = path.join(DB_DIR, 'contacts.json');
const QUICK_REPLIES_FILE = path.join(DB_DIR, 'quick-replies.json');
const AUTO_REPLIES_FILE = path.join(DB_DIR, 'auto-replies.json');
const SESSIONS_META_FILE = path.join(DB_DIR, 'sessions_meta.json');

// Ensure DB directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Helpers for safe JSON reading and writing
function readJSON(filePath, defaultVal = []) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultVal, null, 2), 'utf-8');
      return defaultVal;
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data || (Array.isArray(defaultVal) ? '[]' : '{}'));
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return defaultVal;
  }
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    return false;
  }
}

// --- STATS LOGIC ---
function getStatsForNumber(waNumberId) {
  const contacts = readJSON(CONTACTS_FILE, []);
  const matching = contacts.filter(c => c.wa_number_id === waNumberId);

  // Use a Set to ensure distinct customer_jid
  const activeContacts = new Set();
  const unreadContacts = new Set();
  const archivedContacts = new Set();

  matching.forEach(c => {
    if (c.is_archived) {
      archivedContacts.add(c.jid);
    } else {
      activeContacts.add(c.jid);
    }

    if (c.unreadCount > 0) {
      unreadContacts.add(c.jid);
    }
  });

  return {
    wa_number_id: waNumberId,
    contactCount: activeContacts.size,
    unreadCount: unreadContacts.size,
    archiveCount: archivedContacts.size
  };
}

function getAllNumbersStats() {
  const sessions = getSessionsMeta();
  return sessions.map(s => {
    const stats = getStatsForNumber(s.id);
    return {
      ...s,
      ...stats
    };
  });
}

// --- CONTACTS ---
function getContacts(waNumberId, filter = 'all') {
  const contacts = readJSON(CONTACTS_FILE, []);
  return contacts.filter(c => {
    if (c.wa_number_id !== waNumberId) return false;
    if (filter === 'unread') return c.unreadCount > 0;
    if (filter === 'archive') return c.is_archived === true;
    return !c.is_archived;
  }).sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
}

function getContact(waNumberId, customerJid) {
  const contacts = readJSON(CONTACTS_FILE, []);
  return contacts.find(c => c.wa_number_id === waNumberId && c.jid === customerJid);
}

function upsertContact(waNumberId, customerJid, data = {}) {
  const contacts = readJSON(CONTACTS_FILE, []);
  const index = contacts.findIndex(c => c.wa_number_id === waNumberId && c.jid === customerJid);

  if (index !== -1) {
    contacts[index] = {
      ...contacts[index],
      ...data,
      wa_number_id: waNumberId,
      jid: customerJid
    };
  } else {
    contacts.push({
      wa_number_id: waNumberId,
      jid: customerJid,
      name: data.name || customerJid.replace(/@.*$/, ''),
      phone: data.phone || customerJid.replace(/@.*$/, ''),
      unreadCount: data.unreadCount !== undefined ? data.unreadCount : 0,
      is_archived: data.is_archived || false,
      lastMessage: data.lastMessage || '',
      lastMessageTime: data.lastMessageTime || Date.now(),
      ...data
    });
  }

  writeJSON(CONTACTS_FILE, contacts);
  return contacts[index !== -1 ? index : contacts.length - 1];
}

function markChatAsRead(waNumberId, customerJid) {
  const contacts = readJSON(CONTACTS_FILE, []);
  const index = contacts.findIndex(c => c.wa_number_id === waNumberId && c.jid === customerJid);
  if (index !== -1) {
    contacts[index].unreadCount = 0;
    writeJSON(CONTACTS_FILE, contacts);
    return contacts[index];
  }
  return null;
}

function toggleArchiveChat(waNumberId, customerJid, isArchived) {
  const contacts = readJSON(CONTACTS_FILE, []);
  const index = contacts.findIndex(c => c.wa_number_id === waNumberId && c.jid === customerJid);
  if (index !== -1) {
    contacts[index].is_archived = isArchived !== undefined ? isArchived : !contacts[index].is_archived;
    writeJSON(CONTACTS_FILE, contacts);
    return contacts[index];
  }
  return null;
}

function deleteContactAndChats(waNumberId, customerJid) {
  // 1. Remove from contacts
  const contacts = readJSON(CONTACTS_FILE, []);
  const filteredContacts = contacts.filter(
    c => !(c.wa_number_id === waNumberId && c.jid === customerJid)
  );
  writeJSON(CONTACTS_FILE, filteredContacts);

  // 2. Remove all messages for this chat
  const chats = readJSON(CHATS_FILE, []);
  const filteredChats = chats.filter(
    m => !(m.wa_number_id === waNumberId && m.customer_jid === customerJid)
  );
  writeJSON(CHATS_FILE, filteredChats);

  return true;
}


// --- CHATS / MESSAGES ---
function getMessages(waNumberId, customerJid) {
  const chats = readJSON(CHATS_FILE, []);
  return chats
    .filter(m => m.wa_number_id === waNumberId && m.customer_jid === customerJid)
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
}

function saveMessage(msg) {
  const chats = readJSON(CHATS_FILE, []);
  const msgId = msg.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Deduplicate
  const existingIdx = chats.findIndex(m => m.id === msgId && m.wa_number_id === msg.wa_number_id);
  if (existingIdx !== -1) {
    return chats[existingIdx];
  }

  const newMsg = {
    id: msgId,
    wa_number_id: msg.wa_number_id,
    customer_jid: msg.customer_jid,
    fromMe: Boolean(msg.fromMe),
    type: msg.type || 'text',
    text: msg.text || '',
    mediaUrl: msg.mediaUrl || null,
    audioUrl: msg.audioUrl || null,
    videoUrl: msg.videoUrl || null,
    fileName: msg.fileName || null,
    mimetype: msg.mimetype || null,
    timestamp: msg.timestamp || Date.now(),
    status: msg.status || 'delivered'
  };

  chats.push(newMsg);
  writeJSON(CHATS_FILE, chats);

  // Also update contact summary
  let lastPreview = newMsg.text;
  if (!lastPreview) {
    if (newMsg.type === 'image') lastPreview = '📷 Photo';
    else if (newMsg.type === 'video') lastPreview = '🎥 Video';
    else if (newMsg.type === 'audio') lastPreview = '🎤 Voice Note';
    else if (newMsg.type === 'document') lastPreview = '📄 Document';
    else lastPreview = 'Media message';
  }

  const existingContact = getContact(msg.wa_number_id, msg.customer_jid);
  const currentUnread = existingContact ? (existingContact.unreadCount || 0) : 0;
  const newUnread = msg.fromMe ? currentUnread : (currentUnread + 1);

  upsertContact(msg.wa_number_id, msg.customer_jid, {
    lastMessage: lastPreview,
    lastMessageTime: newMsg.timestamp,
    unreadCount: newUnread
  });

  return newMsg;
}

// --- QUICK REPLIES ---
function getQuickReplies() {
  return readJSON(QUICK_REPLIES_FILE, []);
}

function saveQuickReply(template) {
  const list = readJSON(QUICK_REPLIES_FILE, []);
  const index = list.findIndex(q => q.id === template.id);

  const item = {
    id: template.id || `qr-${Date.now()}`,
    name: template.name.startsWith('/') ? template.name : `/${template.name}`,
    title: template.title || 'Quick Reply',
    text: template.text || '',
    media: Array.isArray(template.media) ? template.media : [],
    createdAt: template.createdAt || Date.now()
  };

  if (index !== -1) {
    list[index] = item;
  } else {
    list.push(item);
  }

  writeJSON(QUICK_REPLIES_FILE, list);
  return item;
}

function deleteQuickReply(id) {
  const list = readJSON(QUICK_REPLIES_FILE, []);
  const filtered = list.filter(q => q.id !== id);
  writeJSON(QUICK_REPLIES_FILE, filtered);
  return true;
}

// --- AUTO REPLIES ---
function getAutoReplies() {
  return readJSON(AUTO_REPLIES_FILE, {});
}

function getAutoReplyForNumber(waNumberId) {
  const configs = readJSON(AUTO_REPLIES_FILE, {});
  return configs[waNumberId] || {
    enabled: false,
    triggerType: 'all',
    businessHours: { start: '09:00', end: '22:00', timezone: 'UTC' },
    keywords: [],
    cooldownMinutes: 15,
    text: '',
    media: []
  };
}

function updateAutoReply(waNumberId, config) {
  const configs = readJSON(AUTO_REPLIES_FILE, {});
  configs[waNumberId] = {
    ...configs[waNumberId],
    ...config,
    wa_number_id: waNumberId
  };
  writeJSON(AUTO_REPLIES_FILE, configs);
  return configs[waNumberId];
}

// --- SESSIONS META ---
function getSessionsMeta() {
  let sessions = readJSON(SESSIONS_META_FILE, []);
  if (!sessions || sessions.length === 0) {
    sessions = Array.from({ length: 10 }, (_, i) => ({
      id: `WA-${i + 1}`,
      name: `WA-${i + 1} (Account ${i + 1})`,
      status: 'disconnected',
      phone: null,
      pushName: null,
      qr: null
    }));
    writeJSON(SESSIONS_META_FILE, sessions);
  }
  return sessions;
}

function updateSessionMeta(sessionId, updates) {
  const sessions = getSessionsMeta();
  const index = sessions.findIndex(s => s.id === sessionId);
  if (index !== -1) {
    sessions[index] = { ...sessions[index], ...updates };
    writeJSON(SESSIONS_META_FILE, sessions);
    return sessions[index];
  }
  return null;
}

module.exports = {
  getStatsForNumber,
  getAllNumbersStats,
  getContacts,
  getContact,
  upsertContact,
  markChatAsRead,
  toggleArchiveChat,
  deleteContactAndChats,
  getMessages,
  saveMessage,
  getQuickReplies,
  saveQuickReply,
  deleteQuickReply,
  getAutoReplies,
  getAutoReplyForNumber,
  updateAutoReply,
  getSessionsMeta,
  updateSessionMeta
};
