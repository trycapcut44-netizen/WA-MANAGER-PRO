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

  // Initialize Socket.io and fetch initial data
  useEffect(() => {
    fetchStatus();
    fetchQuickReplies();
    fetchAutoReplies();

    const socket = io();
    socketRef.current = socket;

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
    });

    socket.on('new_message', ({ sessionId, message }) => {
      // If the incoming message belongs to the current open chat
      setCurrentChat((active) => {
        if (active && active.wa_number_id === sessionId && active.jid === message.customer_jid) {
          setMessages((prevMsgs) => [...prevMsgs, message]);
        }
        return active;
      });

      // Refresh contact list to show updated preview & unread count
      fetchContacts(selectedNumberId, activeTab);
    });

    return () => {
      socket.disconnect();
    };
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
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-wa-dark text-wa-text font-sans">
      {currentChat ? (
        /* ACTIVE CHAT WINDOW VIEW */
        <ChatWindow
          contact={currentChat}
          waNumberId={selectedNumberId}
          messages={messages}
          quickReplies={quickReplies}
          onBack={() => setCurrentChat(null)}
          onSendMessage={handleSendMessage}
          onSendMedia={handleSendMedia}
          onSendQuickReply={handleSendQuickReply}
          onDeleteChat={handleDeleteChat}
        />
      ) : (
        /* MAIN DASHBOARD & CHAT FEED VIEW */
        <>
          {/* Header Top: App Name "WA MANAGER PRO" with a shield icon, Settings and Notification icons */}
          <Header
            onlineCount={onlineCount}
            totalNumbers={10}
            onOpenQR={() => setIsQRModalOpen(true)}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
          />

          {/* Status Card below header: "10 WhatsApp numbers connected - All connected and online - Now synced" */}
          <StatusCard
            onlineCount={onlineCount}
            totalCount={10}
            onOpenQR={() => setIsQRModalOpen(true)}
            onRefresh={fetchStatus}
          />

          {/* Connected Numbers List: Show 10 rows like "WA-1 • 58 Contacts • Online" with green dot */}
          <NumberSelector
            numbers={numbers}
            selectedId={selectedNumberId}
            onSelectNumber={(id) => setSelectedNumberId(id)}
            onOpenQRForNumber={(id) => {
              setSelectedNumberId(id);
              setIsQRModalOpen(true);
            }}
          />

          {/* Filter Tabs: Directly below status card, 3 tabs: All (58) | Unread (7) | Archive (10) */}
          <FilterTabs
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            counts={{
              contactCount: selectedNumber.contactCount || 0,
              unreadCount: selectedNumber.unreadCount || 0,
              archiveCount: selectedNumber.archiveCount || 0
            }}
          />

          {/* Recent Chats Section: List of customer chats for selected number */}
          <ChatList
            contacts={contacts}
            activeTab={activeTab}
            onSelectChat={(contact) => setCurrentChat(contact)}
            onToggleArchive={handleToggleArchive}
            onDeleteChat={handleDeleteChat}
            onStartNewChat={handleStartNewChat}
          />

          {/* Bottom Thumb Navigation Bar */}
          <BottomNav
            activeNav={activeBottomNav}
            onSelectNav={handleSelectNav}
            unreadTotal={unreadTotal}
            onlineCount={onlineCount}
          />
        </>
      )}

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
