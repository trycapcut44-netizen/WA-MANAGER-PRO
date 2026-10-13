import React, { useState } from 'react';
import {
  Search,
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

function getInitials(name = '') {
  if (!name) return 'WA';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name = '') {
  const colors = [
    'bg-emerald-700 text-white',
    'bg-teal-700 text-white',
    'bg-cyan-700 text-white',
    'bg-blue-700 text-white',
    'bg-indigo-700 text-white',
    'bg-violet-700 text-white',
    'bg-purple-700 text-white',
    'bg-amber-700 text-white',
    'bg-rose-700 text-white'
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
    const displayName = contact.name || contact.phone || 'this customer';
    if (window.confirm(`Delete chat with "${displayName}" and remove all messages?`)) {
      onDeleteChat(contact.jid);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-wa-dark select-none relative">
      {/* Search Bar + New Chat Button */}
      <div className="px-3 py-2 bg-wa-dark border-b border-wa-border/50 flex items-center space-x-2">
        <div className="relative flex-1 flex items-center">
          <Search className="w-4 h-4 absolute left-3 text-wa-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search chats or numbers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-wa-panel border border-wa-border/60 text-wa-text text-xs rounded-xl pl-9 pr-3 py-2 placeholder-wa-muted/70 focus:outline-none focus:border-wa-green/60 transition-colors"
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
          className="p-2 rounded-xl bg-wa-green text-wa-dark hover:bg-wa-teal active:scale-95 transition-all shadow-md flex items-center justify-center flex-shrink-0"
          title="Start New Chat / Add Number"
        >
          <UserPlus className="w-4 h-4" />
        </button>
      </div>

      {/* Chats Section */}
      <div className="flex-1 overflow-y-auto divide-y divide-wa-border/40">
        {filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-14 h-14 rounded-full bg-wa-panel flex items-center justify-center text-wa-green mb-3 border border-wa-border shadow-inner">
              <MessageSquare className="w-7 h-7 text-wa-green" />
            </div>
            <p className="text-sm font-bold text-wa-text">No chats in {activeTab}</p>
            <p className="text-xs text-wa-muted mt-1 max-w-xs leading-relaxed">
              {activeTab === 'unread'
                ? 'All messages have been read!'
                : activeTab === 'archive'
                ? 'No chats are currently archived.'
                : 'Dummy data removed. Click below to start a new chat with any WhatsApp number!'}
            </p>

            <button
              onClick={() => setIsNewChatModalOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-wa-green text-wa-dark text-xs font-bold hover:bg-wa-teal active:scale-95 transition-all flex items-center gap-2 shadow-md"
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

            const lastMsg = contact.lastMessage || '';
            const isVoice = lastMsg.toLowerCase().includes('voice') || lastMsg.toLowerCase().includes('audio');
            const isPhoto = lastMsg.toLowerCase().includes('photo') || lastMsg.toLowerCase().includes('image');
            const isVideo = lastMsg.toLowerCase().includes('video');

            return (
              <div
                key={contact.jid}
                onClick={() => onSelectChat(contact)}
                className="group flex items-center px-3.5 py-3 hover:bg-wa-subtle active:bg-wa-panel transition-colors cursor-pointer"
              >
                {/* Avatar with Initials */}
                <div className="relative mr-3 flex-shrink-0">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm tracking-wide shadow-sm ${avatarColor}`}
                  >
                    {initials}
                  </div>
                </div>

                {/* Chat Middle: Name & Last Message */}
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-wa-text truncate">
                      {contact.name || contact.phone}
                    </h3>
                    <span
                      className={`text-[11px] font-medium flex-shrink-0 ml-2 ${
                        hasUnread ? 'text-wa-green font-semibold' : 'text-wa-muted'
                      }`}
                    >
                      {timeStr}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1 text-xs text-wa-muted truncate">
                      {isVoice ? (
                        <>
                          <Mic className="w-3.5 h-3.5 text-wa-green flex-shrink-0" />
                          <span className="truncate text-wa-text/80">{lastMsg}</span>
                        </>
                      ) : isPhoto ? (
                        <>
                          <ImageIcon className="w-3.5 h-3.5 text-wa-green flex-shrink-0" />
                          <span className="truncate text-wa-text/80">{lastMsg}</span>
                        </>
                      ) : isVideo ? (
                        <>
                          <Video className="w-3.5 h-3.5 text-wa-green flex-shrink-0" />
                          <span className="truncate text-wa-text/80">{lastMsg}</span>
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
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-wa-green text-wa-dark text-[11px] font-extrabold flex items-center justify-center shadow-sm">
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
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-wa-muted hover:text-wa-text rounded-lg hover:bg-wa-panel transition-all"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Chat Button (Always accessible or on hover) */}
                      <button
                        onClick={(e) => confirmDelete(e, contact)}
                        title="Delete Chat"
                        className="opacity-70 group-hover:opacity-100 p-1.5 text-wa-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
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
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-wa-panel rounded-2xl border border-wa-border p-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-wa-border mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-wa-green/20 flex items-center justify-center text-wa-green">
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
                <label className="block text-xs font-semibold text-wa-muted mb-1">
                  Phone Number (e.g. 923001234567 or 15551234567) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="+92 300 1234567"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full bg-wa-dark border border-wa-border text-wa-text rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-wa-green"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-wa-muted mb-1">
                  Customer / Contact Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ali Khan"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-wa-dark border border-wa-border text-wa-text rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-wa-green"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-wa-muted mb-1">
                  Initial Message (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Type first message to send..."
                  value={newInitialMsg}
                  onChange={(e) => setNewInitialMsg(e.target.value)}
                  className="w-full bg-wa-dark border border-wa-border text-wa-text rounded-xl p-2.5 text-xs focus:outline-none focus:border-wa-green resize-none"
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
                  className="px-5 py-2 rounded-xl bg-wa-green text-wa-dark text-xs font-bold hover:bg-wa-teal active:scale-95 transition-all flex items-center gap-1.5 shadow-md"
                >
                  <Send className="w-3.5 h-3.5" />
                  Start Chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
