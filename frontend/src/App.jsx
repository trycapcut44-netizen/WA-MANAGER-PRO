import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Header from './components/Header';
import StatusCard from './components/StatusCard';
import NumberSelector from './components/NumberSelector';
import FilterTabs from './components/FilterTabs';
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';
import QuickReplyModal from './components/QuickReplyModal';
import AutoReplyModal from './components/AutoReplyModal';
import QRManagerModal from './components/QRManagerModal';
import SettingsModal from './components/SettingsModal';
import BottomNav from './components/BottomNav';
import { ShieldCheck, QrCode, Zap, Bot, Lock } from 'lucide-react';

export default function App() {
  // Numbers & status
  const [numbers, setNumbers] = useState(
    Array.from({ length: 10 }, (_, i) => ({
      id: `WA-${i + 1}`,
      name: `WA-${i + 1}`,
      status: 'disconnected',
      phone: null,
      pushName: null,
      qr: null,
      contactCount: i === 0 ? 58 : 0,
      unreadCount: i === 0 ? 7 : 0,
      archiveCount: i === 0 ? 10 : 0
    }))
  );

  const [selectedNumberId, setSelectedNumberId] = useState('WA-1');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread' | 'archive'
  const [contacts, setContacts] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [quickReplies, setQuickReplies] = useState([]);
  const [autoReplies, setAutoReplies] = useState({});

  // Modals
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isQuickReplyModalOpen, setIsQuickReplyModalOpen] = useState(false);
  const [isAutoReplyModalOpen, setIsAutoReplyModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [activeBottomNav, setActiveBottomNav] = useState('chats');

  const socketRef = useRef(null);

  // Up-to-date references for event handlers without stale closures
  const selectedNumberIdRef = useRef(selectedNumberId);
  selectedNumberIdRef.current = selectedNumberId;
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const currentChatRef = useRef(currentChat);
  currentChatRef.current = currentChat;

  // Initialize Socket.io and fetch initial data
  useEffect(() => {
    fetchStatus();
    fetchQuickReplies();
    fetchAutoReplies();

    // Direct connection to port 5000 in dev avoids Vite dev proxy timeouts
    const socketUrl = window.location.port === '3000'
      ? `http://${window.location.hostname}:5000`
      : undefined;

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected live to server:', socket.id);
    });

    socket.on('session_list', (list) => {
      setNumbers((prev) =>
        prev.map((item) => {
          const found = list.find((s) => s.id === item.id);
          return found ? { ...item, ...found } : item;
        })
      );
    });

    socket.on('session_update', (update) => {
      setNumbers((prev) =>
        prev.map((item) => (item.id === update.sessionId ? { ...item, ...update } : item))
      );
      if (update.status === 'connected') {
        fetchContacts(selectedNumberIdRef.current, activeTabRef.current);
      } else if (update.sessionId === selectedNumberIdRef.current && (update.status === 'disconnected' || update.status === 'qr_ready')) {
        fetchContacts(selectedNumberIdRef.current, activeTabRef.current);
        setCurrentChat(null);
        setMessages([]);
      }
    });

    socket.on('session_cleared', ({ sessionId }) => {
      if (sessionId === selectedNumberIdRef.current) {
        setContacts([]);
        setCurrentChat(null);
        setMessages([]);
      }
      fetchStatus();
    });

    socket.on('stats_update', (statsList) => {
      setNumbers((prev) =>
        prev.map((item) => {
          const found = statsList.find((s) => s.id === item.id);
          return found
            ? {
                ...item,
                contactCount: found.contactCount,
                unreadCount: found.unreadCount,
                archiveCount: found.archiveCount
              }
            : item;
        })
      );
      // Auto refresh chat list whenever stats update
      fetchContacts(selectedNumberIdRef.current, activeTabRef.current);
    });

    socket.on('new_message', ({ sessionId, message }) => {
      console.log('[Socket] Incoming new message:', message);

      const active = currentChatRef.current;
      if (
        active &&
        active.wa_number_id === sessionId &&
        (active.jid === message.customer_jid || active.jid === message.remoteJid)
      ) {
        setMessages((prevMsgs) => {
          if (prevMsgs.some((m) => m.id === message.id)) return prevMsgs;
          return [...prevMsgs, message];
        });
      }

      // Refresh contact list to show updated last message preview and timestamp
      fetchContacts(selectedNumberIdRef.current, activeTabRef.current);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // 3-second live sync polling to ensure 100% reliable updates
  useEffect(() => {
    const timer = setInterval(() => {
      fetchContacts(selectedNumberIdRef.current, activeTabRef.current);
      if (currentChatRef.current) {
        fetchMessages(currentChatRef.current.wa_number_id, currentChatRef.current.jid);
      }
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Fetch contacts whenever selectedNumberId or activeTab changes
  useEffect(() => {
    fetchContacts(selectedNumberId, activeTab);
  }, [selectedNumberId, activeTab]);

  // Fetch messages whenever currentChat changes
  useEffect(() => {
    if (currentChat) {
      fetchMessages(currentChat.wa_number_id, currentChat.jid);
      // Mark as read in backend
      fetch('/api/chats/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wa_number_id: currentChat.wa_number_id,
          customer_jid: currentChat.jid
        })
      }).then(() => {
        fetchContacts(selectedNumberId, activeTab);
      });
    }
  }, [currentChat]);

  // API Call Helpers
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.success && data.numbers) {
        setNumbers(data.numbers);
      }
    } catch (err) {
      console.error('Failed to fetch status:', err);
    }
  };

  const fetchContacts = async (numberId, filter) => {
    try {
      const res = await fetch(`/api/contacts?wa_number_id=${numberId}&filter=${filter}`);
      const data = await res.json();
      if (data.success) {
        setContacts(data.contacts || []);
        if (data.stats) {
          setNumbers((prev) =>
            prev.map((n) =>
              n.id === numberId
                ? {
                    ...n,
                    contactCount: data.stats.contactCount,
                    unreadCount: data.stats.unreadCount,
                    archiveCount: data.stats.archiveCount
                  }
                : n
            )
          );
        }
      }
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    }
  };

  const fetchMessages = async (numberId, customerJid) => {
    try {
      const res = await fetch(`/api/messages?wa_number_id=${numberId}&customer_jid=${customerJid}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const fetchQuickReplies = async () => {
    try {
      const res = await fetch('/api/quick-replies');
      const data = await res.json();
      if (data.success) {
        setQuickReplies(data.quickReplies || []);
      }
    } catch (err) {
      console.error('Failed to fetch quick replies:', err);
    }
  };

  const fetchAutoReplies = async () => {
    try {
      const res = await fetch('/api/auto-replies');
      const data = await res.json();
      if (data.success) {
        setAutoReplies(data.autoReplies || {});
      }
    } catch (err) {
      console.error('Failed to fetch auto replies:', err);
    }
  };

  // Actions
  const handleSendMessage = async (text) => {
    if (!currentChat) return;
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wa_number_id: currentChat.wa_number_id,
          customer_jid: currentChat.jid,
          text
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [...prev, data.message]);
        fetchContacts(selectedNumberId, activeTab);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleSendMedia = async (file, type) => {
    if (!currentChat) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('wa_number_id', currentChat.wa_number_id);
      formData.append('customer_jid', currentChat.jid);
      formData.append('type', type);

      const res = await fetch('/api/messages/send-media', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [...prev, data.message]);
        fetchContacts(selectedNumberId, activeTab);
      }
    } catch (err) {
      console.error('Error sending media:', err);
    }
  };

  const handleSendQuickReply = async (templateId) => {
    if (!currentChat) return;
    try {
      const res = await fetch('/api/messages/quick-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wa_number_id: currentChat.wa_number_id,
          customer_jid: currentChat.jid,
          templateId
        })
      });
      const data = await res.json();
      if (data.success && data.messages) {
        setMessages((prev) => [...prev, ...data.messages]);
        fetchContacts(selectedNumberId, activeTab);
      }
    } catch (err) {
      console.error('Error sending quick reply:', err);
    }
  };

  const handleToggleArchive = async (customerJid, isArchived) => {
    try {
      await fetch('/api/chats/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wa_number_id: selectedNumberId,
          customer_jid: customerJid,
          isArchived
        })
      });
      fetchContacts(selectedNumberId, activeTab);
    } catch (err) {
      console.error('Error archiving chat:', err);
    }
  };

  const handleDeleteChat = async (customerJid) => {
    try {
      const res = await fetch('/api/chats', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wa_number_id: selectedNumberId,
          customer_jid: customerJid
        })
      });
      const data = await res.json();
      if (data.success) {
        if (currentChat && currentChat.jid === customerJid) {
          setCurrentChat(null);
        }
        fetchContacts(selectedNumberId, activeTab);
        fetchStatus();
      }
    } catch (err) {
      console.error('Error deleting chat:', err);
    }
  };

  const handleStartNewChat = async (phone, name, initialMessage) => {
    try {
      const res = await fetch('/api/contacts/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wa_number_id: selectedNumberId,
          phone,
          name,
          initialMessage
        })
      });
      const data = await res.json();
      if (data.success && data.contact) {
        setCurrentChat(data.contact);
        fetchContacts(selectedNumberId, activeTab);
        fetchStatus();
      }
    } catch (err) {
      console.error('Error starting new chat:', err);
    }
  };

  const handleConnectNumber = async (id) => {
    try {
      const res = await fetch(`/api/sessions/${id}/connect`, { method: 'POST' });
      const data = await res.json();
      fetchStatus();
      return data;
    } catch (err) {
      console.error('Error connecting number:', err);
    }
  };

  const handleLogoutNumber = async (id) => {
    try {
      const res = await fetch(`/api/sessions/${id}/logout`, { method: 'POST' });
      const data = await res.json();
      if (selectedNumberId === id) {
        setContacts([]);
        setCurrentChat(null);
        setMessages([]);
      }
      fetchStatus();
      return data;
    } catch (err) {
      console.error('Error logging out number:', err);
    }
  };

  const handleSaveQuickReply = async (template) => {
    try {
      const res = await fetch('/api/quick-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
      });
      const data = await res.json();
      if (data.success) {
        fetchQuickReplies();
      }
    } catch (err) {
      console.error('Error saving quick reply:', err);
    }
  };

  const handleDeleteQuickReply = async (id) => {
    try {
      await fetch(`/api/quick-replies/${id}`, { method: 'DELETE' });
      fetchQuickReplies();
    } catch (err) {
      console.error('Error deleting quick reply:', err);
    }
  };

  const handleUploadMedia = async (file, type) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`/api/upload?type=${type}`, {
      method: 'POST',
      body: formData
    });
    return await res.json();
  };

  const handleSaveAutoReply = async (waId, config) => {
    try {
      const res = await fetch(`/api/auto-replies/${waId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) {
        fetchAutoReplies();
      }
    } catch (err) {
      console.error('Error saving auto reply:', err);
    }
  };

  // Nav handler
  const handleSelectNav = (navId) => {
    setActiveBottomNav(navId);
    if (navId === 'numbers') {
      setIsQRModalOpen(true);
    } else if (navId === 'quick_replies') {
      setIsQuickReplyModalOpen(true);
    } else if (navId === 'auto_reply') {
      setIsAutoReplyModalOpen(true);
    } else if (navId === 'settings') {
      setIsSettingsModalOpen(true);
    }
  };

  // Statistics calculation for selected number
  const selectedNumber = numbers.find((n) => n.id === selectedNumberId) || numbers[0] || {};
  const onlineCount = numbers.filter((n) => n.status === 'connected').length;
  const unreadTotal = numbers.reduce((acc, n) => acc + (n.unreadCount || 0), 0);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-wa-dark text-wa-text font-sans">
      {/* 1. LEFT SIDEBAR PANEL (WhatsApp Web layout: 380px - 440px on desktop, full width on mobile) */}
      <div
        className={`flex-col h-full bg-wa-panel border-r border-wa-border/80 ${
          currentChat
            ? 'hidden md:flex md:w-[380px] lg:w-[420px] xl:w-[460px] flex-shrink-0'
            : 'flex w-full md:w-[380px] lg:w-[420px] xl:w-[460px] flex-shrink-0'
        }`}
      >
        {/* Top Header with App Logo, QR, Notifications, Quick Actions & Settings */}
        <Header
          onlineCount={onlineCount}
          totalNumbers={10}
          onOpenQR={() => setIsQRModalOpen(true)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onOpenQuickReplies={() => setIsQuickReplyModalOpen(true)}
          onOpenAutoReplies={() => setIsAutoReplyModalOpen(true)}
        />

        {/* Status Card (Online accounts indicator) */}
        <StatusCard
          onlineCount={onlineCount}
          totalCount={10}
          onOpenQR={() => setIsQRModalOpen(true)}
          onRefresh={fetchStatus}
        />

        {/* Connected Numbers Switcher */}
        <NumberSelector
          numbers={numbers}
          selectedId={selectedNumberId}
          onSelectNumber={(id) => {
            setSelectedNumberId(id);
            setCurrentChat(null);
          }}
          onOpenQRForNumber={(id) => {
            setSelectedNumberId(id);
            setIsQRModalOpen(true);
          }}
        />

        {/* Filter Tabs (All / Unread / Archive) */}
        <FilterTabs
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          counts={{
            contactCount: selectedNumber.contactCount || 0,
            unreadCount: selectedNumber.unreadCount || 0,
            archiveCount: selectedNumber.archiveCount || 0
          }}
        />

        {/* Scrollable Chat List */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <ChatList
            contacts={contacts}
            activeTab={activeTab}
            selectedChatJid={currentChat?.jid}
            onSelectChat={(contact) => {
              if (currentChat?.jid !== contact.jid) {
                setMessages([]);
              }
              setCurrentChat(contact);
            }}
            onToggleArchive={handleToggleArchive}
            onDeleteChat={handleDeleteChat}
            onStartNewChat={handleStartNewChat}
          />
        </div>

        {/* Bottom Thumb Navigation Bar (Visible on mobile only) */}
        <div className="md:hidden">
          <BottomNav
            activeNav={activeBottomNav}
            onSelectNav={handleSelectNav}
            unreadTotal={unreadTotal}
            onlineCount={onlineCount}
          />
        </div>
      </div>

      {/* 2. RIGHT MAIN PANEL (Active Chat Window OR WhatsApp Web Desktop Placeholder) */}
      <div
        className={`flex-1 flex-col h-full bg-wa-dark relative ${
          currentChat ? 'flex w-full' : 'hidden md:flex'
        }`}
      >
        {currentChat ? (
          /* ACTIVE CHAT WINDOW VIEW */
          <ChatWindow
            key={`${selectedNumberId}_${currentChat.jid}`}
            contact={currentChat}
            waNumberId={selectedNumberId}
            messages={messages}
            quickReplies={quickReplies}
            onBack={() => setCurrentChat(null)}
            onSendMessage={handleSendMessage}
            onSendMedia={handleSendMedia}
            onSendQuickReply={handleSendQuickReply}
            onDeleteChat={(jid) => {
              handleDeleteChat(jid);
              setCurrentChat(null);
            }}
          />
        ) : (
          /* WHATSAPP WEB DESKTOP EMPTY STATE */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center wa-chat-bg select-none relative border-b-8 border-wa-teal">
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-wa-teal mb-5 shadow-md border border-wa-border">
              <ShieldCheck className="w-10 h-10 text-wa-green" />
            </div>

            <h2 className="text-2xl font-semibold text-wa-text tracking-wide mb-2">
              WA MANAGER PRO for Web
            </h2>

            <p className="text-xs text-wa-muted max-w-sm leading-relaxed mb-6">
              Send and receive messages across all 10 WhatsApp numbers without keeping your phone online. Multi-number real-time socket syncing active.
            </p>

            {/* Active Account Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-wa-border text-xs text-wa-muted mb-6 shadow-sm">
              <span className={`w-2 h-2 rounded-full ${selectedNumber.status === 'connected' ? 'bg-wa-green pulse-green' : 'bg-wa-muted'}`}></span>
              <span className="text-wa-text font-bold">{selectedNumber.id}</span>
              <span>•</span>
              <span className={selectedNumber.status === 'connected' ? 'text-wa-green font-medium' : 'text-wa-muted'}>
                {selectedNumber.status === 'connected' ? 'Connected' : 'Disconnected'}
              </span>
              <span>•</span>
              <span>{selectedNumber.contactCount || 0} Contacts</span>
            </div>

            {/* Quick Action Shortcuts */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setIsQRModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-wa-teal hover:bg-wa-teal/90 text-white text-xs font-semibold shadow-md active:scale-95 transition-all flex items-center gap-1.5"
              >
                <QrCode className="w-4 h-4" />
                <span>Scan / 10 QRs</span>
              </button>
              <button
                onClick={() => setIsQuickReplyModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-wa-subtle border border-wa-border text-wa-text text-xs font-semibold shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Quick Replies</span>
              </button>
              <button
                onClick={() => setIsAutoReplyModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-wa-header hover:bg-wa-subtle border border-wa-border text-wa-text text-xs font-semibold shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Bot className="w-4 h-4 text-wa-green" />
                <span>Auto Reply</span>
              </button>
            </div>

            {/* Encryption & Security Note */}
            <div className="absolute bottom-6 flex items-center space-x-1.5 text-[11px] text-wa-muted/70">
              <Lock className="w-3.5 h-3.5" />
              <span>End-to-end encrypted • Multi-session synchronized</span>
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      <QRManagerModal
        isOpen={isQRModalOpen}
        onClose={() => {
          setIsQRModalOpen(false);
          setActiveBottomNav('chats');
        }}
        numbers={numbers}
        onConnectNumber={handleConnectNumber}
        onLogoutNumber={handleLogoutNumber}
        onRefresh={fetchStatus}
      />

      <QuickReplyModal
        isOpen={isQuickReplyModalOpen}
        onClose={() => {
          setIsQuickReplyModalOpen(false);
          setActiveBottomNav('chats');
        }}
        quickReplies={quickReplies}
        onSaveTemplate={handleSaveQuickReply}
        onDeleteTemplate={handleDeleteQuickReply}
        onUploadMedia={handleUploadMedia}
      />

      <AutoReplyModal
        isOpen={isAutoReplyModalOpen}
        onClose={() => {
          setIsAutoReplyModalOpen(false);
          setActiveBottomNav('chats');
        }}
        numbers={numbers}
        autoReplies={autoReplies}
        onSaveAutoReply={handleSaveAutoReply}
        onUploadMedia={handleUploadMedia}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => {
          setIsSettingsModalOpen(false);
          setActiveBottomNav('chats');
        }}
        onlineCount={onlineCount}
      />
    </div>
  );
}
