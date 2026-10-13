# WA MANAGER PRO 🚀
### Mobile-First WhatsApp Multi-Account Management Tool

WA MANAGER PRO is a production-grade, mobile-first WhatsApp multi-account dashboard and messaging management platform powered by **Node.js**, **Express**, **@whiskeysockets/baileys** (pure QR Web protocol, NO official Cloud API required), **Socket.io**, and **React + Tailwind CSS**.

---

## 📱 Mobile-First UI & Design System

- **Dark Theme Palette**: WhatsApp official dark theme (`#0B141A` main background, `#1F2C34` header, `#111B21` panel, `#202C33` incoming bubbles, `#005C4B` outgoing bubbles, `#25D366` green accents).
- **Header Top**: App Name **"WA MANAGER PRO"** with Shield Icon, Live Online Badges, Notifications, and Settings.
- **Status Card**: Dynamic real-time counter: `10 WhatsApp numbers connected - All connected and online - Now synced`.
- **Connected Numbers Selector**: 10 rows format: `WA-1 • 58 Contacts • Online` with pulsing green dot.
- **Filter Tabs**: `All (58)` | `Unread (7)` | `Archive (10)` filtering contacts for the active WhatsApp number.
- **Recent Chats**: Avatars with initials (JM, SA), customer name/number, rich media message previews, relative timestamps (`2m`, `15m`, `1h`), and unread message badges.
- **Thumb-Friendly Bottom Navigation**: Fast one-tap switching between **Chats**, **10 QRs**, **Quick Replies**, **Auto Reply**, and **Settings**.

---

## ⚡ Key Features

### 1. 10 Dedicated WhatsApp Slots with QR Scan & Persistent Sessions
- Connect up to **10 independent WhatsApp numbers** (`WA-1` through `WA-10`).
- Each number slot maintains its own isolated credentials in `/sessions/WA-1` to `/sessions/WA-10` via Baileys `useMultiFileAuthState`.
- **Persistent Sessions**: Credentials stay saved permanently on disk. Even if your phone loses internet or is switched off, the session remains active in the tool. Reconnection occurs automatically without needing to re-scan.
- **All 10 QR Codes on One Page**: View all 10 slots on a single screen with live status, high-resolution QR codes, and explicit Logout buttons.

### 2. Full Chat & Multi-Media Reply System
- Real-time bi-directional messaging powered by Socket.io.
- Full message history with delivery checkmarks (`✓✓`).
- Supports sending & receiving:
  - **Text messages**
  - **Images & Photos**
  - **Videos**
  - **Documents / PDFs**
  - **Voice Notes (PTT)** with playback progress, waveform bars, and 1x/1.5x/2x speed selector.
- **In-Browser Voice Note Recording**: Record voice notes directly in the browser using the HTML5 `MediaRecorder` API with live timer and wave animation.

### 3. Quick Replies (Templates & `/` Trigger)
- Create unlimited Quick Reply templates.
- Each template supports:
  - **Multiple Images** (unlimited)
  - **Multiple Videos**
  - **Voice Note** (recorded directly in browser or uploaded)
  - **Audio Files**
  - **Text message**
- **In-Chat Autocomplete**: Typing `/cars` in chat automatically displays the preview and sends all template media and text sequentially.
- Dedicated quick reply picker button in the chat input bar.

### 4. Smart 24/7 Auto Reply Automation
- Toggle ON/OFF per individual WhatsApp number (`WA-1` to `WA-10`).
- Three configurable trigger modes:
  1. **All Messages**: Auto-replies to every incoming customer direct message.
  2. **Outside Business Hours**: Set your business schedule (e.g. 09:00 - 22:00); auto-replies only when messaged outside working hours.
  3. **Keywords**: Trigger replies on keyword match (e.g. `price, catalog, help, menu`).
- Full support for rich media in auto-replies: Text + Images + Voice Notes.
- **Anti-Spam Cooldown**: Configurable cooldown minutes per customer to avoid repetitive auto-replies.

---

## 📊 Distinct Contact Count Logic

Contact counts strictly track distinct customers, not raw message volume:
```sql
contactCount = SELECT COUNT(DISTINCT customer_jid) FROM chats WHERE wa_number_id = 'WA-1' AND is_archived = false
unreadCount  = SELECT COUNT(DISTINCT customer_jid) WHERE wa_number_id = 'WA-1' AND has_unread = true
archiveCount = SELECT COUNT(DISTINCT customer_jid) WHERE wa_number_id = 'WA-1' AND is_archived = true
```

---

## 📁 Project Structure

```
WA MANAGER PRO/
├── backend/
│   ├── server.js                  # Express + Socket.io Server (Port 5000)
│   ├── baileys/
│   │   └── sessionManager.js      # Baileys multi-account engine, QR, auto-reply
│   ├── database/
│   │   └── db.js                  # File-based database manager & contact queries
│   └── routes/
│       └── api.js                 # REST API endpoints & file upload handlers
├── frontend/
│   ├── index.html                 # Mobile PWA HTML entry point
│   ├── vite.config.js             # Vite config with backend proxy on Port 3000
│   ├── tailwind.config.js         # WhatsApp mobile dark theme tokens
│   ├── src/
│   │   ├── main.jsx               # React entry point
│   │   ├── App.jsx                # Main application state & socket handling
│   │   └── components/
│   │       ├── Header.jsx         # App bar with shield icon & actions
│   │       ├── StatusCard.jsx     # Dynamic sync & online numbers card
│   │       ├── NumberSelector.jsx # 10 rows format: "WA-1 • 58 Contacts • Online"
│   │       ├── FilterTabs.jsx     # All (58) | Unread (7) | Archive (10)
│   │       ├── ChatList.jsx       # Recent chats list with avatar initials
│   │       ├── ChatWindow.jsx     # Full chat history, media & quick reply /
│   │       ├── AudioRecorder.jsx  # In-browser HTML5 MediaRecorder
│   │       ├── QuickReplyModal.jsx# Quick replies manager & template creator
│   │       ├── AutoReplyModal.jsx # Auto reply automation & schedule rules
│   │       ├── QRManagerModal.jsx # All 10 QR codes on one screen
│   │       ├── SettingsModal.jsx  # App configuration & session details
│   │       └── BottomNav.jsx      # Mobile thumb navigation bar
├── sessions/                      # Isolated auth folders
│   ├── WA-1/ ... WA-10/
├── database/                      # Persistent JSON database
│   ├── chats.json
│   ├── contacts.json
│   ├── quick-replies.json
│   ├── auto-replies.json
│   └── sessions_meta.json
├── public/uploads/                # Uploaded images, videos, and voice recordings
└── package.json                   # Root orchestrator (npm run dev)
```

---

## 🚀 Running the Application

To run the complete tool:

```bash
npm run dev
```

This concurrently launches:
1. **Backend Server**: `http://localhost:5000`
2. **Frontend Mobile App**: `http://localhost:3000`

Open **`http://localhost:3000`** in any browser (or mobile browser / responsive device mode) to experience the full native WhatsApp mobile app feel.
