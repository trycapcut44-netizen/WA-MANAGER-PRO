import React from 'react';
import { MessageSquare, QrCode, Zap, Bot, Settings } from 'lucide-react';

export default function BottomNav({
  activeNav = 'chats',
  onSelectNav,
  unreadTotal = 0,
  onlineCount = 0
}) {
  const navItems = [
    {
      id: 'chats',
      label: 'Chats',
      icon: MessageSquare,
      badge: unreadTotal > 0 ? unreadTotal : null
    },
    {
      id: 'numbers',
      label: '10 QRs',
      icon: QrCode,
      badge: `${onlineCount}/10`
    },
    {
      id: 'quick_replies',
      label: 'Quick Replies',
      icon: Zap
    },
    {
      id: 'auto_reply',
      label: 'Auto Reply',
      icon: Bot
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings
    }
  ];

  return (
    <nav className="sticky bottom-0 z-40 bg-wa-header border-t border-wa-border/80 px-2 py-1.5 flex items-center justify-around shadow-lg select-none pb-safe">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeNav === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onSelectNav(item.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all relative active:scale-95 ${
              isActive
                ? 'text-wa-green font-bold'
                : 'text-wa-muted hover:text-wa-text font-medium'
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
              {item.badge && (
                <span className="absolute -top-1.5 -right-3 min-w-[16px] h-4 px-1 rounded-full bg-wa-green text-wa-dark text-[10px] font-extrabold flex items-center justify-center shadow-sm">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 tracking-tight truncate max-w-[64px]">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
