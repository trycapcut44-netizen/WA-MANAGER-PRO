import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Smartphone, QrCode, Check } from 'lucide-react';

export default function NumberSelector({ numbers = [], selectedId = 'WA-1', onSelectNumber, onOpenQRForNumber }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const selectedNumber = numbers.find(n => n.id === selectedId) || numbers[0] || {
    id: 'WA-1',
    contactCount: 58,
    status: 'connected'
  };

  return (
    <div className="mx-3 mb-2">
      {/* Active Selected Number Display & Expand Toggle */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between p-2.5 rounded-lg bg-wa-panel border border-wa-border hover:border-wa-green/40 transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-full bg-wa-header flex items-center justify-center text-wa-muted">
            <Smartphone className="w-4 h-4 text-wa-green" />
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span className="font-bold text-wa-text">{selectedNumber.id}</span>
            <span className="text-wa-muted">•</span>
            <span className="font-medium text-wa-text">
              {selectedNumber.contactCount || 0} Contacts
            </span>
            <span className="text-wa-muted">•</span>
            <div className="flex items-center space-x-1">
              <span className={`w-2 h-2 rounded-full ${selectedNumber.status === 'connected' ? 'bg-wa-green pulse-green' : 'bg-wa-muted'}`}></span>
              <span className={`text-[11px] font-medium ${selectedNumber.status === 'connected' ? 'text-wa-green' : 'text-wa-muted'}`}>
                {selectedNumber.status === 'connected' ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 text-wa-muted">
          <span className="text-[10px] text-wa-muted/80">
            {isExpanded ? 'Hide' : 'Switch (10)'}
          </span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Horizontal Fast Switcher Bar (always accessible) */}
      <div className="flex items-center space-x-1.5 overflow-x-auto py-2 no-scrollbar">
        {numbers.map((num) => {
          const isSelected = num.id === selectedId;
          const isOnline = num.status === 'connected';

          return (
            <button
              key={num.id}
              onClick={() => onSelectNumber(num.id)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center space-x-1.5 border ${
                isSelected
                  ? 'bg-wa-green/20 text-wa-green border-wa-green/60 shadow-sm'
                  : 'bg-wa-panel text-wa-muted border-wa-border hover:bg-wa-subtle hover:text-wa-text'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-wa-green' : 'bg-wa-muted/60'}`}></span>
              <span>{num.id}</span>
              <span className="text-[10px] opacity-75">({num.contactCount || 0})</span>
            </button>
          );
        })}
      </div>

      {/* Full 10 Rows List (Expanded View) */}
      {isExpanded && (
        <div className="mt-1.5 p-1 rounded-xl bg-wa-panel border border-wa-border shadow-lg divide-y divide-wa-border/50 max-h-72 overflow-y-auto">
          {numbers.map((num) => {
            const isSelected = num.id === selectedId;
            const isOnline = num.status === 'connected';

            return (
              <div
                key={num.id}
                onClick={() => {
                  onSelectNumber(num.id);
                  setIsExpanded(false);
                }}
                className={`p-2.5 flex items-center justify-between rounded-lg cursor-pointer transition-colors ${
                  isSelected ? 'bg-wa-header/80' : 'hover:bg-wa-subtle'
                }`}
              >
                <div className="flex items-center space-x-2.5 text-xs">
                  <div className="w-6 h-6 rounded-md bg-wa-dark flex items-center justify-center font-bold text-[11px] text-wa-green border border-wa-border">
                    {num.id.replace('WA-', '')}
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-wa-text">{num.id}</span>
                      <span className="text-wa-muted">•</span>
                      <span className="text-wa-text font-medium">
                        {num.contactCount || 0} Contacts
                      </span>
                      <span className="text-wa-muted">•</span>
                      <div className="flex items-center space-x-1">
                        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-wa-green pulse-green' : 'bg-wa-muted'}`}></span>
                        <span className={`text-[11px] font-medium ${isOnline ? 'text-wa-green' : 'text-wa-muted'}`}>
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                    {num.phone && (
                      <p className="text-[10px] text-wa-muted mt-0.5">
                        +{num.phone} {num.pushName ? `(${num.pushName})` : ''}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {!isOnline && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenQRForNumber(num.id);
                      }}
                      className="px-2 py-0.5 rounded bg-wa-teal/20 text-wa-green border border-wa-green/30 text-[10px] font-medium hover:bg-wa-teal/30"
                    >
                      Connect QR
                    </button>
                  )}
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-wa-green/20 text-wa-green flex items-center justify-center">
                      <Check className="w-3 h-3 text-wa-green" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
