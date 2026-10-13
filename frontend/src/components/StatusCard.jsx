import React from 'react';
import { CheckCircle2, RefreshCw, QrCode, Wifi } from 'lucide-react';

export default function StatusCard({ onlineCount = 10, totalCount = 10, onOpenQR, onRefresh }) {
  const isAllConnected = onlineCount === totalCount && totalCount > 0;

  return (
    <div className="mx-3 mt-3 mb-2 p-3.5 rounded-xl bg-wa-panel border border-wa-border/70 shadow-sm relative overflow-hidden">
      {/* Background soft ambient glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-wa-green/5 rounded-full blur-2xl pointer-events-none"></div>

      <div className="flex items-start justify-between relative z-10">
        <div className="flex items-start space-x-3">
          <div className="mt-0.5 relative">
            <div className="w-8 h-8 rounded-lg bg-wa-green/15 flex items-center justify-center text-wa-green">
              <CheckCircle2 className="w-5 h-5 text-wa-green" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-wa-green pulse-green border-2 border-wa-panel"></span>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-wa-text flex items-center gap-1.5">
              <span>{onlineCount > 0 ? `${onlineCount} WhatsApp numbers connected` : 'WhatsApp Accounts Manager'}</span>
            </h2>
            <p className="text-xs text-wa-muted font-normal mt-0.5">
              {onlineCount > 0 
                ? 'All connected and online • Now synced' 
                : 'Scan QR codes to connect your WhatsApp numbers'}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-wa-dark text-wa-green border border-wa-border">
                <Wifi className="w-3 h-3 text-wa-green animate-pulse" />
                Persistent Multi-Session
              </span>
              <span className="text-[11px] text-wa-muted">
                Slots: {totalCount} Max
              </span>
            </div>
          </div>
        </div>

        {/* Action Button: QR Overview */}
        <button
          onClick={onOpenQR}
          className="px-2.5 py-1.5 rounded-lg bg-wa-header hover:bg-wa-subtle active:scale-95 border border-wa-border text-xs text-wa-text font-medium flex items-center gap-1.5 transition-all shadow-sm"
        >
          <QrCode className="w-3.5 h-3.5 text-wa-green" />
          <span>QRs</span>
        </button>
      </div>
    </div>
  );
}
