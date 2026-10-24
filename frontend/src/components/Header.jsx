import React from 'react';
import { ShieldCheck, Settings, Bell, QrCode, Zap, Bot } from 'lucide-react';

export default function Header({
  onlineCount,
  totalNumbers,
  onOpenQR,
  onOpenSettings,
  onOpenQuickReplies,
  onOpenAutoReplies
}) {
  return (
    <header className="sticky top-0 z-40 bg-wa-header border-b border-wa-border/80 px-4 py-3 flex items-center justify-between shadow-md select-none">
      {/* Left: App Logo & Title */}
      <div className="flex items-center space-x-2.5">
        <div className="w-9 h-9 rounded-full bg-wa-teal/20 border border-wa-green/30 flex items-center justify-center text-wa-green shadow-inner">
          <ShieldCheck className="w-5 h-5 text-wa-green" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-wa-text flex items-center gap-1.5 leading-none">
            WA MANAGER PRO
            <span className="text-[10px] bg-wa-teal/25 text-wa-green border border-wa-green/40 px-1.5 py-0.5 rounded font-mono font-semibold">
              v1.0
            </span>
          </h1>
          <p className="text-[11px] text-wa-muted font-medium mt-0.5">
            Multi-Account Control Center
          </p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center space-x-1">
        {/* Quick Replies Shortcut (Desktop view) */}
        {onOpenQuickReplies && (
          <button
            onClick={onOpenQuickReplies}
            title="Quick Replies (/templates)"
            className="p-2 rounded-full hover:bg-wa-subtle active:scale-95 text-wa-muted hover:text-amber-400 transition-all hidden md:flex"
          >
            <Zap className="w-5 h-5 text-amber-400" />
          </button>
        )}

        {/* Auto Reply Bot Shortcut (Desktop view) */}
        {onOpenAutoReplies && (
          <button
            onClick={onOpenAutoReplies}
            title="Auto Reply Rules"
            className="p-2 rounded-full hover:bg-wa-subtle active:scale-95 text-wa-muted hover:text-wa-green transition-all hidden md:flex"
          >
            <Bot className="w-5 h-5" />
          </button>
        )}

        {/* QR Manager button */}
        <button
          onClick={onOpenQR}
          title="All 10 QR Codes"
          className="p-2 rounded-full hover:bg-wa-subtle active:scale-95 text-wa-muted hover:text-wa-green transition-all"
        >
          <QrCode className="w-5 h-5" />
        </button>

        {/* Notifications Icon with active badge */}
        <button
          onClick={onOpenQR}
          title="Numbers Online Status"
          className="p-2 rounded-full hover:bg-wa-subtle active:scale-95 text-wa-muted hover:text-wa-text relative transition-all"
        >
          <Bell className="w-5 h-5" />
          {onlineCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-wa-green pulse-green"></span>
          )}
        </button>

        {/* Settings Icon */}
        <button
          onClick={onOpenSettings}
          title="Settings"
          className="p-2 rounded-full hover:bg-wa-subtle active:scale-95 text-wa-muted hover:text-wa-text transition-all"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
