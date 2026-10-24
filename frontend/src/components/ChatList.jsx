import React, { useState } from 'react';
import {
  Search,
  Users,
  Phone,
  Mic,
  Image as ImageIcon,
  Video,
  FileText,
  Archive,
  Check,
  CheckCheck,
  Trash2,
  Plus,
  UserPlus,
  X,
  Send,
  MessageSquare
} from 'lucide-react';

function formatPhoneNumber(str = '') {
  if (!str) return '';
  const clean = str.replace(/@.*$/, '').replace(/[^\d+]/g, '');
  if (clean.length === 12 && clean.startsWith('92')) {
    return `+92 ${clean.slice(2, 5)} ${clean.slice(5, 8)} ${clean.slice(8)}`;
  }
  if (clean.length === 11 && clean.startsWith('03')) {
    return `+92 ${clean.slice(1, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`;
  }
  if (clean.length === 11 && clean.startsWith('1')) {
    return `+1 (${clean.slice(1, 4)}) ${clean.slice(4, 7)}-${clean.slice(7)}`;
  }
  if (clean.length >= 10 && clean.length <= 13) {
    return clean.startsWith('+') ? clean : `+${clean}`;
  }
  if (clean.length > 13) {
    return `ID: ${clean.slice(0, 4)}...${clean.slice(-4)}`;
  }
  return clean ? `+${clean}` : '';
}

function formatDisplayName(contact) {
  if (!contact) return 'WhatsApp Chat';
  if (contact.name && contact.name !== contact.jid && !contact.name.includes('@') && !/^\d{14,}$/.test(contact.name)) {
    return contact.name;
  }
  const raw = (contact.phone || contact.jid || '').replace(/@.*$/, '');
  if (/^\d{10,13}$/.test(raw)) {
    return formatPhoneNumber(raw);
  }
  if (contact.is_group || contact.jid?.endsWith('@g.us')) {
    return contact.name || 'WhatsApp Group';
  }
  return contact.name || 'WhatsApp Customer';
}

function getInitials(name = '') {
  if (!name) return 'WA';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name = '') {
  const colors = [
    'bg-emerald-600 text-white',
    'bg-teal-600 text-white',
    'bg-cyan-600 text-white',
    'bg-blue-600 text-white',
    'bg-indigo-600 text-white',
    'bg-violet-600 text-white',
    'bg-purple-600 text-white',
    'bg-amber-600 text-white',
    'bg-rose-600 text-white'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d`;
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export default function ChatList({
  contacts = [],
  activeTab = 'all',
  selectedChatJid = null,
  onSelectChat,
  onToggleArchive,
  onDeleteChat,
  onStartNewChat
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [newInitialMsg, setNewInitialMsg] = useState('');

  const filteredContacts = contacts.filter((c) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const nameMatch = (c.name || '').toLowerCase().includes(query);
    const phoneMatch = (c.phone || '').toLowerCase().includes(query);
    const msgMatch = (c.lastMessage || '').toLowerCase().includes(query);
    return nameMatch || phoneMatch || msgMatch;
  });

  const handleCreateNewChat = (e) => {
    e.preventDefault();
    if (!newPhone.trim()) return;

    onStartNewChat(newPhone.trim(), newName.trim(), newInitialMsg.trim());
    setNewPhone('');
    setNewName('');
    setNewInitialMsg('');
    setIsNewChatModalOpen(false);
  };

  const confirmDelete = (e, contact) => {
    e.stopPropagation();
    const displayName = formatDisplayName(contact);
    if (window.confirm(`Delete chat with "${displayName}" and remove all messages?`)) {
      onDeleteChat(contact.jid);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white select-none relative">
      {/* Search Bar + New Chat Button */}
      <div className="px-3 py-2 bg-white border-b border-wa-border flex items-center space-x-2">
        <div className="relative flex-1 flex items-center">
          <Search className="w-4 h-4 absolute left-3 text-wa-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search or start new chat"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F0F2F5] border border-transparent text-wa-text text-xs rounded-xl pl-9 pr-3 py-2 placeholder-[#667781] focus:outline-none focus:bg-white focus:border-wa-teal transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 text-wa-muted hover:text-wa-text text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Add/Message New Number Button */}
        <button
          onClick={() => setIsNewChatModalOpen(true)}
          className="p-2 rounded-xl bg-wa-teal text-white hover:bg-wa-teal/90 active:scale-95 transition-all shadow-sm flex items-center justify-center flex-shrink-0"
          title="Start New Chat / Add Number"
        >
          <UserPlus className="w-4 h-4" />
        </button>
      </div>

      {/* Chats Section */}
      <div className="flex-1 overflow-y-auto divide-y divide-wa-border/60">
        {filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-14 h-14 rounded-full bg-wa-header flex items-center justify-center text-wa-teal mb-3 border border-wa-border shadow-inner">
              <MessageSquare className="w-7 h-7 text-wa-teal" />
            </div>
            <p className="text-sm font-bold text-wa-text">No chats in {activeTab}</p>
            <p className="text-xs text-wa-muted mt-1 max-w-xs leading-relaxed">
              {activeTab === 'unread'
                ? 'All messages have been read!'
                : activeTab === 'archive'
                ? 'No chats are currently archived.'
                : 'No conversations found. Click below to start a new chat with any WhatsApp number!'}
            </p>

            <button
              onClick={() => setIsNewChatModalOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-wa-teal text-white text-xs font-bold hover:bg-wa-teal/90 active:scale-95 transition-all flex items-center gap-2 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Start New WhatsApp Chat</span>
            </button>
          </div>
        ) : (
          filteredContacts.map((contact) => {
            const initials = getInitials(contact.name || contact.phone);
            const avatarColor = getAvatarColor(contact.name || contact.phone || 'User');
            const hasUnread = (contact.unreadCount || 0) > 0;
            const timeStr = formatRelativeTime(contact.lastMessageTime);
            const isSelected = selectedChatJid === contact.jid;

            const lastMsg = contact.lastMessage || '';
            const isVoice = lastMsg.toLowerCase().includes('voice') || lastMsg.toLowerCase().includes('audio');
            const isPhoto = lastMsg.toLowerCase().includes('photo') || lastMsg.toLowerCase().includes('image');
            const isVideo = lastMsg.toLowerCase().includes('video');

            return (
              <div
                key={contact.jid}
                onClick={() => onSelectChat(contact)}
                className={`group flex items-center px-3.5 py-3 transition-colors cursor-pointer border-l-4 ${
                  isSelected
                    ? 'bg-[#E9EDEF] border-wa-teal'
                    : 'border-transparent hover:bg-[#F5F6F6] active:bg-[#E9EDEF]'
                }`}
              >
                {/* Avatar with Real WhatsApp DP or fallback initials */}
                <div className="relative mr-3 flex-shrink-0">
                  {contact.avatarUrl ? (
                    <img
                      src={contact.avatarUrl}
                      alt={contact.name}
                      className="w-12 h-12 rounded-full object-cover shadow-sm border border-wa-border"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.nextSibling) {
                          e.currentTarget.nextSibling.style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm tracking-wide shadow-sm ${avatarColor}`}
                    style={{ display: contact.avatarUrl ? 'none' : 'flex' }}
                  >
                    {contact.is_group ? <Users className="w-5 h-5 text-white" /> : initials}
                  </div>
                </div>

                {/* Chat Middle: Name, Phone Number, & Last Message */}
                <div className="flex-1 min-w-0 pr-2">
                  {/* Row 1: Name & Time */}
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center space-x-1.5 truncate min-w-0">
                      {contact.is_group && <Users className="w-3.5 h-3.5 text-wa-teal flex-shrink-0" />}
                      <h3 className="text-sm font-bold text-[#111B21] truncate">
                        {formatDisplayName(contact)}
                      </h3>
                    </div>
                    <span
                      className={`text-[11px] font-medium flex-shrink-0 ml-2 ${
                        hasUnread ? 'text-wa-teal font-bold' : 'text-wa-muted'
                      }`}
                    >
                      {timeStr}
                    </span>
                  </div>

                  {/* Row 2: Prominently Visible Phone Number or Group Info */}
                  <div className="flex items-center gap-1.5 text-xs mb-1">
                    {contact.is_group ? (
                      <span className="text-[11px] text-[#667781] font-medium flex items-center gap-1">
                        <Users className="w-3 h-3 text-wa-teal" />
                        <span>{contact.phone || 'WhatsApp Group'}</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-wa-teal font-mono font-semibold flex items-center gap-1 bg-wa-teal/10 px-1.5 py-0.5 rounded">
                        <Phone className="w-3 h-3 text-wa-teal" />
                        <span>{formatPhoneNumber(contact.phone || contact.jid)}</span>
                      </span>
                    )}
                  </div>

                  {/* Row 3: Last Message & Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1 text-xs text-[#667781] truncate">
                      {isVoice ? (
                        <>
                          <Mic className="w-3.5 h-3.5 text-wa-teal flex-shrink-0" />
                          <span className="truncate text-wa-text">{lastMsg}</span>
                        </>
                      ) : isPhoto ? (
                        <>
                          <ImageIcon className="w-3.5 h-3.5 text-wa-teal flex-shrink-0" />
                          <span className="truncate text-wa-text">{lastMsg}</span>
                        </>
                      ) : isVideo ? (
                        <>
                          <Video className="w-3.5 h-3.5 text-wa-teal flex-shrink-0" />
                          <span className="truncate text-wa-text">{lastMsg}</span>
                        </>
                      ) : (
                        <>
                          <CheckCheck className="w-3.5 h-3.5 text-wa-muted flex-shrink-0" />
                          <span className="truncate">{lastMsg || 'Tap to chat'}</span>
                        </>
                      )}
                    </div>

                    {/* Actions: Unread Badge, Archive, and Delete Button */}
                    <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                      {hasUnread && (
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-wa-teal text-white text-[11px] font-extrabold flex items-center justify-center shadow-sm">
                          {contact.unreadCount}
                        </span>
                      )}

                      {/* Archive toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleArchive(contact.jid, !contact.is_archived);
                        }}
                        title={contact.is_archived ? 'Unarchive' : 'Archive'}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-wa-muted hover:text-wa-text rounded-lg hover:bg-wa-header transition-all"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Chat Button */}
                      <button
                        onClick={(e) => confirmDelete(e, contact)}
                        title="Delete Chat"
                        className="opacity-70 group-hover:opacity-100 p-1.5 text-wa-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Start New Chat Modal */}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-wa-border p-5 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-wa-border mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-wa-teal/15 flex items-center justify-center text-wa-teal">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-wa-text">New WhatsApp Chat</h3>
                  <p className="text-[11px] text-wa-muted">Enter phone number with country code</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewChatModalOpen(false)}
                className="p-1 rounded-full text-wa-muted hover:text-wa-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewChat} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-wa-text mb-1">
                  Phone Number (e.g. 923001234567 or 15551234567) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="+92 300 1234567"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full bg-[#F0F2F5] border border-wa-border text-wa-text rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white focus:border-wa-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-wa-text mb-1">
                  Customer / Contact Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ali Khan"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[#F0F2F5] border border-wa-border text-wa-text rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white focus:border-wa-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-wa-text mb-1">
                  Initial Message (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Type first message to send..."
                  value={newInitialMsg}
                  onChange={(e) => setNewInitialMsg(e.target.value)}
                  className="w-full bg-[#F0F2F5] border border-wa-border text-wa-text rounded-xl p-2.5 text-xs focus:outline-none focus:bg-white focus:border-wa-teal resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewChatModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-wa-header text-xs text-wa-muted hover:text-wa-text font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-wa-teal text-white text-xs font-bold hover:bg-wa-teal/90 active:scale-95 transition-all flex items-center gap-1.5 shadow-md"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Start Chat</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
