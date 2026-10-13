import React from 'react';
import { MessageSquare, Mail, Archive } from 'lucide-react';

export default function FilterTabs({ activeTab = 'all', onSelectTab, counts = { contactCount: 58, unreadCount: 7, archiveCount: 10 } }) {
  const tabs = [
    {
      id: 'all',
      label: 'All',
      count: counts.contactCount || 0,
      icon: MessageSquare,
      badgeColor: 'bg-wa-dark text-wa-muted'
    },
    {
      id: 'unread',
      label: 'Unread',
      count: counts.unreadCount || 0,
      icon: Mail,
      badgeColor: counts.unreadCount > 0 ? 'bg-wa-green text-wa-dark font-bold' : 'bg-wa-dark text-wa-muted'
    },
    {
      id: 'archive',
      label: 'Archive',
      count: counts.archiveCount || 0,
      icon: Archive,
      badgeColor: 'bg-wa-dark text-wa-muted'
    }
  ];

  return (
    <div className="px-3 py-1.5 flex items-center space-x-2 border-b border-wa-border/80 bg-wa-dark">
      {tabs.map((t) => {
        const isActive = activeTab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onSelectTab(t.id)}
            className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all select-none ${
              isActive
                ? 'bg-wa-panel text-wa-green border border-wa-green/30 shadow-sm'
                : 'bg-transparent text-wa-muted hover:text-wa-text hover:bg-wa-subtle'
            }`}
          >
            <span>{t.label}</span>
            <span
              className={`text-[11px] px-1.5 py-0.2 rounded-full transition-colors ${
                isActive && t.id === 'unread' && t.count > 0
                  ? 'bg-wa-green text-black font-extrabold'
                  : isActive
                  ? 'bg-wa-header text-wa-text'
                  : 'bg-wa-subtle text-wa-muted'
              }`}
            >
              {t.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
