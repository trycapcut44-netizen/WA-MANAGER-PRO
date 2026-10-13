import React, { useState, useEffect } from 'react';
import {
  X,
  Bot,
  Clock,
  Key,
  MessageSquare,
  Image as ImageIcon,
  Video,
  Mic,
  Volume2,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import AudioRecorder from './AudioRecorder';

export default function AutoReplyModal({
  isOpen,
  onClose,
  numbers = [],
  autoReplies = {},
  onSaveAutoReply,
  onUploadMedia
}) {
  const [selectedWaId, setSelectedWaId] = useState('WA-1');
  const [config, setConfig] = useState({
    enabled: false,
    triggerType: 'all',
    businessHours: { start: '09:00', end: '22:00', timezone: 'UTC' },
    keywords: ['price', 'catalog', 'help'],
    cooldownMinutes: 15,
    text: '',
    media: []
  });

  const [keywordsInput, setKeywordsInput] = useState('');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Load config whenever selected WA number changes or autoReplies update
  useEffect(() => {
    const current = autoReplies[selectedWaId] || {
      enabled: false,
      triggerType: 'all',
      businessHours: { start: '09:00', end: '22:00', timezone: 'UTC' },
      keywords: ['price', 'catalog', 'help'],
      cooldownMinutes: 15,
      text: '',
      media: []
    };
    setConfig(current);
    setKeywordsInput((current.keywords || []).join(', '));
  }, [selectedWaId, autoReplies]);

  if (!isOpen) return null;

  const handleToggle = () => {
    setConfig((prev) => ({ ...prev, enabled: !prev.enabled }));
  };

  const handleFileUpload = async (e, type) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of files) {
        const uploaded = await onUploadMedia(file, type);
        if (uploaded && uploaded.file) {
          setConfig((prev) => ({
            ...prev,
            media: [
              ...(prev.media || []),
              {
                id: `ar-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                type,
                url: uploaded.file.url,
                name: file.name,
                mimetype: file.type
              }
            ]
          }));
        }
      }
    } catch (err) {
      console.error('File upload error:', err);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleVoiceRecorded = async (blob) => {
    setIsRecordingVoice(false);
    setIsUploading(true);
    try {
      const file = new File([blob], `autoreply-voice-${Date.now()}.webm`, { type: blob.type || 'audio/webm' });
      const uploaded = await onUploadMedia(file, 'voice');
      if (uploaded && uploaded.file) {
        setConfig((prev) => ({
          ...prev,
          media: [
            ...(prev.media || []),
            {
              id: `ar-voice-${Date.now()}`,
              type: 'voice',
              url: uploaded.file.url,
              name: 'Auto Reply Voice Note.webm',
              mimetype: 'audio/webm'
            }
          ]
        }));
      }
    } catch (err) {
      console.error('Auto reply voice recording error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const removeMediaItem = (idx) => {
    setConfig((prev) => ({
      ...prev,
      media: prev.media.filter((_, i) => i !== idx)
    }));
  };

  const handleSave = () => {
    const updatedKeywords = keywordsInput
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const updatedConfig = {
      ...config,
      keywords: updatedKeywords
    };

    onSaveAutoReply(selectedWaId, updatedConfig);
    setStatusMessage(`Saved Auto Reply for ${selectedWaId}!`);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 select-none">
      <div className="w-full max-w-lg bg-wa-panel rounded-t-3xl sm:rounded-2xl border border-wa-border max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
        {/* Modal Top Header */}
        <div className="px-4 py-3.5 bg-wa-header border-b border-wa-border flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-wa-green/20 flex items-center justify-center text-wa-green">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-wa-text">Auto Reply Automation</h2>
              <p className="text-[11px] text-wa-muted">
                Configure smart 24/7 triggers per WhatsApp number
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Status Alert */}
          {statusMessage && (
            <div className="p-2.5 rounded-xl bg-wa-green/20 border border-wa-green/40 text-wa-green text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Select Number (WA-1 to WA-10) */}
          <div>
            <label className="block text-xs font-semibold text-wa-muted mb-1.5">
              Select WhatsApp Number (1 of 10)
            </label>
            <div className="flex items-center space-x-1.5 overflow-x-auto py-1 no-scrollbar">
              {Array.from({ length: 10 }, (_, i) => `WA-${i + 1}`).map((id) => {
                const isSelected = id === selectedWaId;
                const isEnabled = autoReplies[id]?.enabled;

                return (
                  <button
                    key={id}
                    onClick={() => setSelectedWaId(id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border flex-shrink-0 ${
                      isSelected
                        ? 'bg-wa-green text-wa-dark border-wa-green shadow-sm'
                        : 'bg-wa-dark text-wa-muted border-wa-border hover:bg-wa-subtle hover:text-wa-text'
                    }`}
                  >
                    <span>{id}</span>
                    {isEnabled && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ON / OFF Switch */}
          <div className="p-3.5 rounded-2xl bg-wa-dark border border-wa-border flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-wa-text flex items-center gap-1.5">
                <span>Auto Reply for {selectedWaId}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    config.enabled
                      ? 'bg-wa-green/20 text-wa-green border border-wa-green/40'
                      : 'bg-wa-header text-wa-muted border border-wa-border'
                  }`}
                >
                  {config.enabled ? 'ACTIVE & RUNNING' : 'DISABLED'}
                </span>
              </h3>
              <p className="text-[11px] text-wa-muted mt-0.5">
                Automatically reply to incoming messages based on rules below
              </p>
            </div>

            <button
              onClick={handleToggle}
              className="p-1 text-wa-green active:scale-95 transition-transform"
            >
              {config.enabled ? (
                <ToggleRight className="w-9 h-9 text-wa-green fill-wa-green/30" />
              ) : (
                <ToggleLeft className="w-9 h-9 text-wa-muted" />
              )}
            </button>
          </div>

          {/* Trigger Condition Selector */}
          <div>
            <label className="block text-xs font-semibold text-wa-muted mb-1.5">
              Trigger Criteria
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setConfig({ ...config, triggerType: 'all' })}
                className={`p-2.5 rounded-xl text-xs font-semibold border flex flex-col items-center justify-center space-y-1 transition-all ${
                  config.triggerType === 'all'
                    ? 'bg-wa-green/15 text-wa-green border-wa-green shadow-sm'
                    : 'bg-wa-dark text-wa-muted border-wa-border hover:bg-wa-subtle'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>All Messages</span>
              </button>

              <button
                onClick={() => setConfig({ ...config, triggerType: 'hours' })}
                className={`p-2.5 rounded-xl text-xs font-semibold border flex flex-col items-center justify-center space-y-1 transition-all ${
                  config.triggerType === 'hours'
                    ? 'bg-wa-green/15 text-wa-green border-wa-green shadow-sm'
                    : 'bg-wa-dark text-wa-muted border-wa-border hover:bg-wa-subtle'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Outside Hours</span>
              </button>

              <button
                onClick={() => setConfig({ ...config, triggerType: 'keywords' })}
                className={`p-2.5 rounded-xl text-xs font-semibold border flex flex-col items-center justify-center space-y-1 transition-all ${
                  config.triggerType === 'keywords'
                    ? 'bg-wa-green/15 text-wa-green border-wa-green shadow-sm'
                    : 'bg-wa-dark text-wa-muted border-wa-border hover:bg-wa-subtle'
                }`}
              >
                <Key className="w-4 h-4" />
                <span>Keywords</span>
              </button>
            </div>
          </div>

          {/* Conditional Trigger Settings */}
          {config.triggerType === 'hours' && (
            <div className="p-3 rounded-2xl bg-wa-dark border border-wa-border space-y-2">
              <p className="text-xs font-semibold text-wa-text">Business Working Hours</p>
              <p className="text-[11px] text-wa-muted">
                Messages received outside this timeframe will receive the auto reply.
              </p>
              <div className="flex items-center space-x-2 pt-1">
                <div className="flex-1">
                  <label className="text-[10px] text-wa-muted block mb-0.5">Start Time</label>
                  <input
                    type="time"
                    value={config.businessHours?.start || '09:00'}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        businessHours: { ...config.businessHours, start: e.target.value }
                      })
                    }
                    className="w-full bg-wa-panel border border-wa-border text-wa-text rounded-xl p-2 text-xs focus:outline-none focus:border-wa-green"
                  />
                </div>
                <span className="text-wa-muted text-xs pt-4">to</span>
                <div className="flex-1">
                  <label className="text-[10px] text-wa-muted block mb-0.5">End Time</label>
                  <input
                    type="time"
                    value={config.businessHours?.end || '22:00'}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        businessHours: { ...config.businessHours, end: e.target.value }
                      })
                    }
                    className="w-full bg-wa-panel border border-wa-border text-wa-text rounded-xl p-2 text-xs focus:outline-none focus:border-wa-green"
                  />
                </div>
              </div>
            </div>
          )}

          {config.triggerType === 'keywords' && (
            <div className="p-3 rounded-2xl bg-wa-dark border border-wa-border space-y-1.5">
              <label className="text-xs font-semibold text-wa-text block">
                Trigger Keywords (comma-separated)
              </label>
              <input
                type="text"
                placeholder="price, catalog, help, info, menu"
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
                className="w-full bg-wa-panel border border-wa-border text-wa-text rounded-xl p-2 text-xs focus:outline-none focus:border-wa-green"
              />
              <p className="text-[10px] text-wa-muted">
                Triggers when customer message contains any of these words.
              </p>
            </div>
          )}

          {/* Anti-Spam Cooldown */}
          <div>
            <label className="block text-xs font-semibold text-wa-muted mb-1">
              Anti-Spam Cooldown per Contact (Minutes)
            </label>
            <input
              type="number"
              min="1"
              max="1440"
              value={config.cooldownMinutes || 15}
              onChange={(e) => setConfig({ ...config, cooldownMinutes: Number(e.target.value) })}
              className="w-full bg-wa-dark border border-wa-border text-wa-text rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-wa-green"
            />
            <p className="text-[10px] text-wa-muted mt-1">
              Won't repeat auto-reply to the same customer within this duration.
            </p>
          </div>

          {/* Auto Reply Text Content */}
          <div>
            <label className="block text-xs font-semibold text-wa-muted mb-1">
              Auto Reply Text Message
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Thanks for your message! We will reply first thing tomorrow morning."
              value={config.text || ''}
              onChange={(e) => setConfig({ ...config, text: e.target.value })}
              className="w-full bg-wa-dark border border-wa-border text-wa-text rounded-xl p-3 text-xs focus:outline-none focus:border-wa-green resize-none"
            />
          </div>

          {/* Auto Reply Rich Media Attachments */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-wa-muted">
                Auto Reply Media Items ({config.media?.length || 0})
              </label>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-2">
              <label className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-wa-header hover:bg-wa-subtle border border-wa-border cursor-pointer text-xs font-medium text-wa-text">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <span>+ Image</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'image')}
                />
              </label>

              <label className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-wa-header hover:bg-wa-subtle border border-wa-border cursor-pointer text-xs font-medium text-wa-text">
                <Video className="w-4 h-4 text-purple-400" />
                <span>+ Video</span>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'video')}
                />
              </label>

              <button
                onClick={() => setIsRecordingVoice(true)}
                className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-wa-header hover:bg-wa-subtle border border-wa-border text-xs font-medium text-wa-text"
              >
                <Mic className="w-4 h-4 text-wa-green" />
                <span>+ Voice</span>
              </button>
            </div>

            {/* In-Modal Voice Recorder for Auto-Reply */}
            {isRecordingVoice && (
              <div className="mb-2">
                <AudioRecorder
                  onRecordingComplete={handleVoiceRecorded}
                  onCancel={() => setIsRecordingVoice(false)}
                />
              </div>
            )}

            {/* Media preview list */}
            {config.media && config.media.length > 0 && (
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {config.media.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-xl bg-wa-dark border border-wa-border text-xs"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      {item.type === 'image' && <ImageIcon className="w-4 h-4 text-cyan-400 flex-shrink-0" />}
                      {item.type === 'video' && <Video className="w-4 h-4 text-purple-400 flex-shrink-0" />}
                      {(item.type === 'voice' || item.type === 'audio') && (
                        <Volume2 className="w-4 h-4 text-wa-green flex-shrink-0" />
                      )}
                      <span className="truncate text-wa-text font-medium">{item.name}</span>
                    </div>
                    <button
                      onClick={() => removeMediaItem(idx)}
                      className="text-wa-muted hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-wa-header border-t border-wa-border flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-wa-panel text-xs text-wa-muted hover:text-wa-text font-medium"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={isUploading}
            className="px-5 py-2 rounded-xl bg-wa-green text-wa-dark text-xs font-bold hover:bg-wa-teal active:scale-95 transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Save for {selectedWaId}
          </button>
        </div>
      </div>
    </div>
  );
}
