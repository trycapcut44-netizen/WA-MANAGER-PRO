import React, { useState } from 'react';
import {
  X,
  Settings,
  ShieldCheck,
  Folder,
  Database,
  Bell,
  Smartphone,
  Info,
  CheckCircle2
} from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, onlineCount = 0 }) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoSync, setAutoSync] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 select-none">
      <div className="w-full max-w-lg bg-wa-panel rounded-t-3xl sm:rounded-2xl border border-wa-border max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="px-4 py-3.5 bg-wa-header border-b border-wa-border flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-wa-green/20 flex items-center justify-center text-wa-green">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-wa-text">Application Settings</h2>
              <p className="text-[11px] text-wa-muted">
                WA MANAGER PRO System Configuration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-wa-muted hover:text-wa-text hover:bg-wa-subtle transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
          {/* Storage Information */}
          <div className="p-3.5 rounded-2xl bg-wa-dark border border-wa-border space-y-2">
            <div className="flex items-center space-x-2 text-wa-green font-bold">
              <Folder className="w-4 h-4" />
              <span>Session & Database Paths</span>
            </div>
            <div className="space-y-1 text-wa-muted">
              <p className="flex justify-between">
                <span>Multi-Session Storage:</span>
                <code className="text-wa-text font-mono">/sessions/WA-1 .. WA-10</code>
              </p>
              <p className="flex justify-between">
                <span>Database File:</span>
                <code className="text-wa-text font-mono">/database/chats.json</code>
              </p>
              <p className="flex justify-between">
                <span>Quick Replies:</span>
                <code className="text-wa-text font-mono">/quick-replies/</code>
              </p>
              <p className="flex justify-between">
                <span>Media Uploads:</span>
                <code className="text-wa-text font-mono">/public/uploads/</code>
              </p>
            </div>
          </div>

          {/* Engine & Baileys Status */}
          <div className="p-3.5 rounded-2xl bg-wa-dark border border-wa-border space-y-2">
            <div className="flex items-center space-x-2 text-wa-text font-bold">
              <ShieldCheck className="w-4 h-4 text-wa-green" />
              <span>WhatsApp Baileys Engine</span>
            </div>
            <div className="space-y-1 text-wa-muted">
              <p className="flex justify-between">
                <span>Baileys Protocol:</span>
                <span className="text-wa-green font-semibold">@whiskeysockets/baileys 6.7</span>
              </p>
              <p className="flex justify-between">
                <span>Connection Mode:</span>
                <span className="text-wa-text">Multi-File Auth (Persistent)</span>
              </p>
              <p className="flex justify-between">
                <span>Multi-Device Capacity:</span>
                <span className="text-wa-green font-semibold">10 Dedicated Phone Slots</span>
              </p>
              <p className="flex justify-between">
                <span>Offline Retention:</span>
                <span className="text-cyan-400">Keeps online without phone signal</span>
              </p>
            </div>
          </div>

          {/* Preferences */}
          <div className="p-3.5 rounded-2xl bg-wa-dark border border-wa-border space-y-3">
            <h3 className="font-bold text-wa-text">Preferences</h3>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-wa-text">Message Sound Notifications</p>
                <p className="text-[10px] text-wa-muted">Play alert audio chime on new message</p>
              </div>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-wa-border">
              <div>
                <p className="font-medium text-wa-text">Real-time Socket.io Sync</p>
                <p className="text-[10px] text-wa-muted">Instant bi-directional live sync</p>
              </div>
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded"
              />
            </div>
          </div>

          {/* About */}
          <div className="p-3 rounded-2xl bg-wa-header/40 border border-wa-border text-center space-y-1">
            <h4 className="font-bold text-wa-text">WA MANAGER PRO • Multi-Account Hub</h4>
            <p className="text-[10px] text-wa-muted">
              Designed for high-throughput multi-agent messaging & automation.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-wa-header border-t border-wa-border flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-wa-green text-wa-dark text-xs font-bold hover:bg-wa-teal active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
