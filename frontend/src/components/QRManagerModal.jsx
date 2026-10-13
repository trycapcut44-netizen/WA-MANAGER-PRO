import React, { useState } from 'react';
import {
  X,
  QrCode,
  Smartphone,
  CheckCircle2,
  RefreshCw,
  LogOut,
  Wifi,
  AlertCircle,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export default function QRManagerModal({
  isOpen,
  onClose,
  numbers = [],
  onConnectNumber,
  onLogoutNumber,
  onRefresh
}) {
  const [connectingId, setConnectingId] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  if (!isOpen) return null;

  const handleConnect = async (id) => {
    setConnectingId(id);
    try {
      await onConnectNumber(id);
    } catch (err) {
      console.error('Connect failed:', err);
    } finally {
      setConnectingId(null);
    }
  };

  const handleLogout = async (id) => {
    if (window.confirm(`Are you sure you want to log out and delete session credentials for ${id}?`)) {
      await onLogoutNumber(id);
    }
  };

  const onlineCount = numbers.filter((n) => n.status === 'connected').length;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 select-none">
      <div className="w-full max-w-2xl bg-wa-panel rounded-t-3xl sm:rounded-2xl border border-wa-border max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
        {/* Top Header */}
        <div className="px-4 py-3.5 bg-wa-header border-b border-wa-border flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-full bg-wa-green/20 flex items-center justify-center text-wa-green">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-wa-text">10 WhatsApp QR Connect Center</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-wa-dark text-wa-green border border-wa-green/30">
                  {onlineCount}/10 Online
                </span>
              </div>
              <p className="text-[11px] text-wa-muted">
                Persistent Baileys Sessions • Auto-reconnect enabled
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={onRefresh}
              title="Refresh Status"
              className="p-2 text-wa-muted hover:text-wa-text rounded-full hover:bg-wa-subtle transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-wa-muted hover:text-wa-text hover:bg-wa-subtle transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Info Card */}
        <div className="px-4 py-2.5 bg-wa-dark/80 border-b border-wa-border flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-wa-muted">
            <ShieldCheck className="w-4 h-4 text-wa-green flex-shrink-0" />
            <span>
              Sessions stored securely in <code className="text-wa-green">/sessions/WA-1</code> to <code className="text-wa-green">/sessions/WA-10</code>
            </span>
          </div>
          <button
            onClick={() => {
              numbers.filter(n => n.status !== 'connected').forEach(n => onConnectNumber(n.id));
            }}
            className="text-[11px] font-bold text-wa-green hover:underline flex-shrink-0 ml-2"
          >
            Connect All Offline
          </button>
        </div>

        {/* 10 QR Cards Grid / List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {numbers.map((num) => {
              const isOnline = num.status === 'connected';
              const isQRReady = num.status === 'qr_ready' && num.qr;
              const isConnecting = num.status === 'connecting' || connectingId === num.id;

              return (
                <div
                  key={num.id}
                  className={`p-3.5 rounded-2xl bg-wa-dark border transition-all flex flex-col justify-between ${
                    isOnline
                      ? 'border-wa-green/40 shadow-sm'
                      : isQRReady
                      ? 'border-amber-400/50 shadow-md ring-1 ring-amber-400/30'
                      : 'border-wa-border hover:border-wa-muted'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-lg bg-wa-header flex items-center justify-center font-bold text-xs text-wa-text">
                        {num.id.replace('WA-', '')}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-wa-text">{num.id}</h3>
                        <p className="text-[10px] text-wa-muted truncate max-w-[130px]">
                          {num.name || `Account ${num.id}`}
                        </p>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div className="flex items-center space-x-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isOnline
                            ? 'bg-wa-green pulse-green'
                            : isQRReady
                            ? 'bg-amber-400 animate-pulse'
                            : isConnecting
                            ? 'bg-cyan-400 animate-pulse'
                            : 'bg-wa-muted'
                        }`}
                      ></span>
                      <span
                        className={`text-[11px] font-semibold ${
                          isOnline
                            ? 'text-wa-green'
                            : isQRReady
                            ? 'text-amber-400'
                            : isConnecting
                            ? 'text-cyan-400'
                            : 'text-wa-muted'
                        }`}
                      >
                        {isOnline ? 'Online' : isQRReady ? 'Scan QR' : isConnecting ? 'Connecting' : 'Offline'}
                      </span>
                    </div>
                  </div>

                  {/* Card Middle: Content or QR Code */}
                  <div className="my-2">
                    {isOnline ? (
                      <div className="p-2.5 rounded-xl bg-wa-header/70 border border-wa-border/80 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-wa-muted">Phone Number:</span>
                          <span className="font-mono font-bold text-wa-text">
                            {num.phone ? `+${num.phone}` : 'Connected'}
                          </span>
                        </div>
                        {num.pushName && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-wa-muted">Account Name:</span>
                            <span className="font-medium text-wa-green truncate max-w-[120px]">
                              {num.pushName}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-xs pt-0.5">
                          <span className="text-wa-muted">Contacts:</span>
                          <span className="font-semibold text-wa-text">
                            {num.contactCount || 0} Distinct
                          </span>
                        </div>
                        <div className="pt-1 flex items-center gap-1 text-[10px] text-wa-green">
                          <Wifi className="w-3 h-3 text-wa-green" />
                          <span>Persistent Session Active</span>
                        </div>
                      </div>
                    ) : isQRReady ? (
                      /* Display High Resolution Baileys QR Code */
                      <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-wa-border">
                        <img
                          src={num.qr}
                          alt={`WhatsApp QR ${num.id}`}
                          className="w-44 h-44 object-contain rounded"
                        />
                        <p className="text-[10px] text-black font-semibold mt-1">
                          Scan with WhatsApp &gt; Linked Devices
                        </p>
                      </div>
                    ) : (
                      /* Disconnected State */
                      <div className="p-4 rounded-xl bg-wa-header/40 border border-wa-border/50 flex flex-col items-center justify-center text-center space-y-1">
                        <Smartphone className="w-7 h-7 text-wa-muted/60" />
                        <p className="text-xs font-medium text-wa-muted">No Active Session</p>
                        <p className="text-[10px] text-wa-muted/70">
                          Click below to generate QR code
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom: Actions */}
                  <div className="mt-1 flex items-center justify-end space-x-2">
                    {isOnline ? (
                      <button
                        onClick={() => handleLogout(num.id)}
                        className="w-full py-1.5 px-3 rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors active:scale-95"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Logout Session</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnect(num.id)}
                        disabled={isConnecting}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-md active:scale-95 ${
                          isQRReady
                            ? 'bg-amber-500 text-black hover:bg-amber-400'
                            : 'bg-wa-green text-wa-dark hover:bg-wa-teal'
                        } disabled:opacity-50`}
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>
                          {isConnecting
                            ? 'Connecting...'
                            : isQRReady
                            ? 'Refresh QR Code'
                            : 'Generate QR & Connect'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-wa-header border-t border-wa-border flex items-center justify-between">
          <p className="text-[11px] text-wa-muted">
            All 10 QR codes viewable simultaneously
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-wa-panel hover:bg-wa-subtle text-xs text-wa-text font-bold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
