const fs = require('fs');
const path = require('path');

const sampleCustomers = [
  { name: "John Miller", phone: "+1 (555) 234-8901", jid: "15552348901@s.whatsapp.net", unread: 2, archived: false, lastMsg: "Can you send the pricing for the 2024 Mercedes?", timeAgo: 2 },
  { name: "Sarah Adams", phone: "+1 (555) 492-1209", jid: "15554921209@s.whatsapp.net", unread: 1, archived: false, lastMsg: "Thanks! I received the voice note.", timeAgo: 15 },
  { name: "David Chen", phone: "+1 (555) 789-3421", jid: "15557893421@s.whatsapp.net", unread: 4, archived: false, lastMsg: "Is the catalog still available?", timeAgo: 45 },
  { name: "Emily Watson", phone: "+44 7911 123456", jid: "447911123456@s.whatsapp.net", unread: 0, archived: false, lastMsg: "Understood, will let you know tomorrow.", timeAgo: 60 },
  { name: "Michael Rodriguez", phone: "+1 (555) 321-9876", jid: "15553219876@s.whatsapp.net", unread: 0, archived: false, lastMsg: "Payment processed successfully.", timeAgo: 120 },
  { name: "Jessica Taylor", phone: "+1 (555) 654-3210", jid: "15556543210@s.whatsapp.net", unread: 0, archived: false, lastMsg: "Can we schedule a call at 3 PM?", timeAgo: 180 },
  { name: "Robert Fox", phone: "+1 (555) 987-6543", jid: "15559876543@s.whatsapp.net", unread: 0, archived: false, lastMsg: "Sent over the signed contract doc.", timeAgo: 240 },
  { name: "Amanda Bell", phone: "+61 491 570 156", jid: "61491570156@s.whatsapp.net", unread: 0, archived: false, lastMsg: "Awesome, thank you!", timeAgo: 360 },
  { name: "James Wilson", phone: "+1 (555) 112-2334", jid: "15551122334@s.whatsapp.net", unread: 0, archived: true, lastMsg: "Old inquiry resolved.", timeAgo: 1440 },
  { name: "Sophia Martinez", phone: "+1 (555) 445-5667", jid: "15554455667@s.whatsapp.net", unread: 0, archived: true, lastMsg: "Archived deal closed.", timeAgo: 2880 }
];

// Generate up to 58 active contacts + 10 archived contacts for WA-1 to match requirements
const contacts = [];
const chats = [];
const now = Date.now();

// 1. Unread contacts (7 total unread contacts)
for (let i = 1; i <= 7; i++) {
  const jid = `1555000${100 + i}@s.whatsapp.net`;
  const name = i === 1 ? "John Miller" : i === 2 ? "Sarah Adams" : i === 3 ? "David Chen" : `Client Lead #${i}`;
  const unreadCount = i === 1 ? 2 : i === 2 ? 1 : 1;
  const time = now - (i * 7 * 60 * 1000);
  
  contacts.push({
    jid,
    wa_number_id: "WA-1",
    name,
    phone: `+1 555-000-${100 + i}`,
    unreadCount,
    is_archived: false,
    lastMessage: i === 1 ? "Can you send the pricing for the 2024 Mercedes?" : "Hey, following up on our chat!",
    lastMessageTime: time
  });

  // Add conversation messages
  chats.push({
    id: `msg-${jid}-1`,
    wa_number_id: "WA-1",
    customer_jid: jid,
    fromMe: false,
    type: "text",
    text: i === 1 ? "Hi there! I saw your post on WhatsApp about the luxury car fleet." : "Hello team!",
    timestamp: time - 60000,
    status: "delivered"
  });
  chats.push({
    id: `msg-${jid}-2`,
    wa_number_id: "WA-1",
    customer_jid: jid,
    fromMe: true,
    type: "text",
    text: "Hello! Welcome to WA MANAGER PRO Support. How can we help you today?",
    timestamp: time - 30000,
    status: "read"
  });
  chats.push({
    id: `msg-${jid}-3`,
    wa_number_id: "WA-1",
    customer_jid: jid,
    fromMe: false,
    type: "text",
    text: i === 1 ? "Can you send the pricing for the 2024 Mercedes?" : "Hey, following up on our chat!",
    timestamp: time,
    status: "delivered"
  });
}

// 2. Read active contacts (51 more active contacts = total 58 active contacts for WA-1)
for (let i = 8; i <= 58; i++) {
  const jid = `1555000${100 + i}@s.whatsapp.net`;
  const name = `Customer #${i}`;
  const time = now - (i * 45 * 60 * 1000);
  
  contacts.push({
    jid,
    wa_number_id: "WA-1",
    name,
    phone: `+1 555-000-${100 + i}`,
    unreadCount: 0,
    is_archived: false,
    lastMessage: i % 3 === 0 ? "Voice Note (0:14)" : "Thank you for the quick assistance!",
    lastMessageTime: time
  });

  chats.push({
    id: `msg-${jid}-1`,
    wa_number_id: "WA-1",
    customer_jid: jid,
    fromMe: false,
    type: "text",
    text: "Hi, I have a quick question regarding delivery.",
    timestamp: time - 120000,
    status: "read"
  });
  chats.push({
    id: `msg-${jid}-2`,
    wa_number_id: "WA-1",
    customer_jid: jid,
    fromMe: true,
    type: "text",
    text: "All deliveries are dispatched on schedule with live tracking.",
    timestamp: time - 60000,
    status: "read"
  });
  chats.push({
    id: `msg-${jid}-3`,
    wa_number_id: "WA-1",
    customer_jid: jid,
    fromMe: false,
    type: i % 3 === 0 ? "audio" : "text",
    text: i % 3 === 0 ? "" : "Thank you for the quick assistance!",
    audioUrl: i % 3 === 0 ? "/uploads/sample-voice.mp3" : null,
    timestamp: time,
    status: "read"
  });
}

// 3. Archived contacts (10 archived contacts for WA-1)
for (let i = 1; i <= 10; i++) {
  const jid = `1555999${100 + i}@s.whatsapp.net`;
  const name = `Archived Account #${i}`;
  const time = now - (i * 24 * 60 * 60 * 1000);
  
  contacts.push({
    jid,
    wa_number_id: "WA-1",
    name,
    phone: `+1 555-999-${100 + i}`,
    unreadCount: 0,
    is_archived: true,
    lastMessage: "Conversation marked as closed.",
    lastMessageTime: time
  });

  chats.push({
    id: `msg-${jid}-1`,
    wa_number_id: "WA-1",
    customer_jid: jid,
    fromMe: true,
    type: "text",
    text: "Conversation marked as closed.",
    timestamp: time,
    status: "read"
  });
}

fs.writeFileSync(path.join(__dirname, 'database', 'contacts.json'), JSON.stringify(contacts, null, 2));
fs.writeFileSync(path.join(__dirname, 'database', 'chats.json'), JSON.stringify(chats, null, 2));
console.log(`Generated ${contacts.length} contacts and ${chats.length} messages.`);
