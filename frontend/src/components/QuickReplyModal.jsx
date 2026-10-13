import React, { useState, useRef } from 'react';
import {
  X,
  Plus,
  Zap,
  Image as ImageIcon,
  Video,
  Mic,
  Volume2,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  Edit2,
  Upload,
  Eye
} from 'lucide-react';
import AudioRecorder from './AudioRecorder';

export default function QuickReplyModal({
  isOpen,
  onClose,
  quickReplies = [],
  onSaveTemplate,
  onDeleteTemplate,
  onUploadMedia
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateText, setTemplateText] = useState('');
  const [mediaItems, setMediaItems] = useState([]);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [playingMediaUrl, setPlayingMediaUrl] = useState(null);
  const [previewImageModal, setPreviewImageModal] = useState(null);

  const audioPlayerRef = useRef(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setEditingId(null);
    setTemplateName('');
    setTemplateTitle('');
    setTemplateText('');
    setMediaItems([]);
    setIsRecordingVoice(false);
    setIsCreating(false);
    setErrorMsg('');
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setPlayingMediaUrl(null);
    }
  };

  const startEdit = (template) => {
    setEditingId(template.id);
    setTemplateName(template.name);
    setTemplateTitle(template.title);
    setTemplateText(template.text || '');
    setMediaItems(template.media || []);
    setIsCreating(true);
    setErrorMsg('');
  };

  // Upload Custom Pictures or Audio Files
  const handleFileUpload = async (e, type) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    setErrorMsg('');
    try {
      for (const file of files) {
        const uploaded = await onUploadMedia(file, type);
        if (uploaded && uploaded.file) {
          setMediaItems((prev) => [
            ...prev,
            {
              id: `m-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
              type,
              url: uploaded.file.url,
              name: file.name,
              mimetype: file.type
            }
          ]);
        }
      }
    } catch (err) {
      setErrorMsg('Failed to upload file');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Custom Voice Note recorded via browser mic
  const handleVoiceRecorded = async (blob) => {
    setIsRecordingVoice(false);
    setIsUploading(true);
    try {
      const file = new File([blob], `custom-voice-${Date.now()}.webm`, { type: blob.type || 'audio/webm' });
      const uploaded = await onUploadMedia(file, 'voice');
      if (uploaded && uploaded.file) {
        setMediaItems((prev) => [
          ...prev,
          {
            id: `m-${Date.now()}`,
            type: 'voice',
            url: uploaded.file.url,
            name: `Recorded Voice Note (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
            mimetype: 'audio/webm'
          }
        ]);
      }
    } catch (err) {
      setErrorMsg('Failed to save recorded voice note');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    if (!templateName.trim()) {
      setErrorMsg('Template shortcut name is required (e.g. /cars)');
      return;
    }

    const shortcut = templateName.trim().startsWith('/') ? templateName.trim() : `/${templateName.trim()}`;

    const templateData = {
      id: editingId || `qr-${Date.now()}`,
      name: shortcut,
      title: templateTitle.trim() || shortcut,
      text: templateText.trim(),
      media: mediaItems,
      createdAt: Date.now()
    };

    onSaveTemplate(templateData);
    resetForm();
  };

  const removeMediaItem = (idx) => {
    setMediaItems(mediaItems.filter((_, i) => i !== idx));
  };

  const togglePlayAudio = (url) => {
    if (playingMediaUrl === url) {
      audioPlayerRef.current?.pause();
      setPlayingMediaUrl(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const audio = new Audio(url);
      audioPlayerRef.current = audio;
      audio.onended = () => setPlayingMediaUrl(null);
      audio.play().catch((err) => console.warn('Play audio failed:', err));
      setPlayingMediaUrl(url);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 select-none">
      <div className="w-full max-w-lg bg-wa-panel rounded-t-3xl sm:rounded-2xl border border-wa-border max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
        {/* Top Modal Header */}
        <div className="px-4 py-3.5 bg-wa-header border-b border-wa-border flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-400/20 flex items-center justify-center text-amber-400">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-wa-text">Quick Replies Manager</h2>
              <p className="text-[11px] text-wa-muted">
                {isCreating
                  ? editingId
                    ? 'Edit template & custom media'
                    : 'Create new template with custom pics & voice'
                  : 'Templates triggered with /name in chat'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="p-1.5 rounded-full text-wa-muted hover:text-wa-text hover:bg-wa-subtle transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-red-900/30 border border-red-500/40 text-red-200 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isCreating ? (
            /* ================= CREATE / EDIT TEMPLATE FORM ================= */
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-wa-muted mb-1">
                  Shortcut Command (Trigger with / in chat) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-wa-green font-bold text-sm">/</span>
                  <input
                    type="text"
                    placeholder="cars"
                    value={templateName.replace(/^\//, '')}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full bg-wa-dark border border-wa-border text-wa-text rounded-xl pl-7 pr-3 py-2 text-xs focus:outline-none focus:border-wa-green"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-wa-muted mb-1">
                  Title / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Luxury Car Fleet Showcase"
                  value={templateTitle}
                  onChange={(e) => setTemplateTitle(e.target.value)}
                  className="w-full bg-wa-dark border border-wa-border text-wa-text rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-wa-green"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-wa-muted mb-1">
                  Text Message
                </label>
                <textarea
                  rows={3}
                  placeholder="Type your message text here..."
                  value={templateText}
                  onChange={(e) => setTemplateText(e.target.value)}
                  className="w-full bg-wa-dark border border-wa-border text-wa-text rounded-xl p-3 text-xs focus:outline-none focus:border-wa-green resize-none"
                />
              </div>

              {/* Custom Pictures & Custom Voice Section */}
              <div className="p-3 rounded-2xl bg-wa-dark border border-wa-border/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-wa-text flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Custom Pictures & Voice Notes</span>
                  </label>
                  <span className="text-[11px] text-wa-green font-bold bg-wa-header px-2 py-0.5 rounded-full border border-wa-border">
                    {mediaItems.length} added
                  </span>
                </div>

                {/* Upload Action Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {/* 1. Add Custom Pictures */}
                  <label className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-wa-header hover:bg-wa-subtle border border-wa-border hover:border-cyan-400/40 cursor-pointer text-xs font-semibold text-wa-text transition-all active:scale-95 text-center">
                    <ImageIcon className="w-5 h-5 text-cyan-400 mb-1" />
                    <span>+ Custom Pics</span>
                    <span className="text-[10px] text-wa-muted font-normal">Photos</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'image')}
                    />
                  </label>

                  {/* 2. Record Custom Voice Note */}
                  <button
                    type="button"
                    onClick={() => setIsRecordingVoice(true)}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-wa-header hover:bg-wa-subtle border border-wa-border hover:border-wa-green/40 text-xs font-semibold text-wa-text transition-all active:scale-95 text-center"
                  >
                    <Mic className="w-5 h-5 text-wa-green mb-1" />
                    <span>+ Record Voice</span>
                    <span className="text-[10px] text-wa-muted font-normal">Mic</span>
                  </button>

                  {/* 3. Upload Custom Audio File */}
                  <label className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-wa-header hover:bg-wa-subtle border border-wa-border hover:border-amber-400/40 cursor-pointer text-xs font-semibold text-wa-text transition-all active:scale-95 text-center">
                    <Volume2 className="w-5 h-5 text-amber-400 mb-1" />
                    <span>+ Upload Audio</span>
                    <span className="text-[10px] text-wa-muted font-normal">MP3 / WAV</span>
                    <input
                      type="file"
                      accept="audio/*,.mp3,.wav,.ogg,.m4a,.opus"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'voice')}
                    />
                  </label>
                </div>

                {/* Live In-Modal Voice Note Recorder */}
                {isRecordingVoice && (
                  <div className="my-2">
                    <AudioRecorder
                      onRecordingComplete={handleVoiceRecorded}
                      onCancel={() => setIsRecordingVoice(false)}
                    />
                  </div>
                )}

                {/* List of Attached Custom Media Items with Previews */}
                {mediaItems.length > 0 && (
                  <div className="space-y-2 pt-1 max-h-48 overflow-y-auto">
                    {mediaItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-xl bg-wa-panel border border-wa-border flex items-center justify-between text-xs"
                      >
                        {/* Thumbnail / Icon */}
                        <div className="flex items-center space-x-2.5 truncate min-w-0 flex-1">
                          {item.type === 'image' ? (
                            <div className="relative group/pic flex-shrink-0">
                              <img
                                src={item.url}
                                alt={item.name}
                                className="w-10 h-10 object-cover rounded-lg border border-wa-border"
                              />
                              <button
                                type="button"
                                onClick={() => setPreviewImageModal(item.url)}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover/pic:opacity-100 flex items-center justify-center rounded-lg text-white"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (item.type === 'voice' || item.type === 'audio') ? (
                            <button
                              type="button"
                              onClick={() => togglePlayAudio(item.url)}
                              className="w-9 h-9 rounded-full bg-wa-green/20 text-wa-green flex items-center justify-center flex-shrink-0 active:scale-95 hover:bg-wa-green hover:text-wa-dark transition-all"
                              title="Play Custom Voice Note"
                            >
                              {playingMediaUrl === item.url ? (
                                <Pause className="w-4 h-4 fill-current" />
                              ) : (
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                              )}
                            </button>
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-wa-header flex items-center justify-center text-purple-400 flex-shrink-0">
                              <Video className="w-4 h-4" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-wa-text truncate">{item.name}</p>
                            <span className="text-[10px] text-wa-muted capitalize">
                              {item.type === 'image' ? 'Custom Picture' : 'Custom Voice Note'}
                            </span>
                          </div>
                        </div>

                        {/* Remove item button */}
                        <button
                          type="button"
                          onClick={() => removeMediaItem(idx)}
                          className="p-1.5 text-wa-muted hover:text-red-400 hover:bg-wa-header rounded-lg transition-colors ml-2"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-wa-border">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded-xl bg-wa-header text-xs text-wa-muted hover:text-wa-text font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isUploading}
                  className="px-5 py-2 rounded-xl bg-wa-green text-wa-dark text-xs font-bold hover:bg-wa-teal active:scale-95 transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {editingId ? 'Update Template' : 'Save Template'}
                </button>
              </div>
            </div>
          ) : (
            /* ================= TEMPLATES LIST VIEW ================= */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-wa-muted">
                  Active Templates ({quickReplies.length})
                </span>
                <button
                  onClick={() => setIsCreating(true)}
                  className="px-3 py-1.5 rounded-xl bg-wa-green text-wa-dark text-xs font-bold flex items-center space-x-1.5 active:scale-95 shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Template</span>
                </button>
              </div>

              {quickReplies.length === 0 ? (
                <div className="text-center py-10 text-wa-muted text-xs">
                  No quick replies created yet. Click "Create Template" to add one!
                </div>
              ) : (
                <div className="space-y-2.5">
                  {quickReplies.map((qr) => {
                    const picsCount = (qr.media || []).filter((m) => m.type === 'image').length;
                    const voiceCount = (qr.media || []).filter((m) => m.type === 'voice' || m.type === 'audio').length;

                    return (
                      <div
                        key={qr.id}
                        className="p-3.5 rounded-2xl bg-wa-dark border border-wa-border hover:border-wa-green/30 transition-all flex flex-col space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 pr-2 flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-bold text-xs text-wa-green bg-wa-header px-2 py-0.5 rounded-lg border border-wa-border">
                                {qr.name}
                              </span>
                              <span className="text-xs font-semibold text-wa-text truncate">
                                {qr.title}
                              </span>
                            </div>

                            {qr.text && (
                              <p className="text-[11px] text-wa-muted mt-1.5 line-clamp-2">
                                {qr.text}
                              </p>
                            )}
                          </div>

                          {/* Edit & Delete Action Buttons */}
                          <div className="flex items-center space-x-1 flex-shrink-0">
                            <button
                              onClick={() => startEdit(qr)}
                              className="p-1.5 text-wa-muted hover:text-wa-green hover:bg-wa-header rounded-lg transition-colors"
                              title="Edit Custom Pics & Voice"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDeleteTemplate(qr.id)}
                              className="p-1.5 text-wa-muted hover:text-red-400 hover:bg-wa-header rounded-lg transition-colors"
                              title="Delete Template"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Media Badges & Previews */}
                        {qr.media && qr.media.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {picsCount > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-wa-panel text-cyan-400 px-2 py-0.5 rounded-md border border-wa-border font-medium">
                                <ImageIcon className="w-3 h-3" />
                                {picsCount} Custom Pics
                              </span>
                            )}
                            {voiceCount > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-wa-panel text-wa-green px-2 py-0.5 rounded-md border border-wa-border font-medium">
                                <Volume2 className="w-3 h-3" />
                                {voiceCount} Custom Voice
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Picture Zoom Modal */}
      {previewImageModal && (
        <div
          onClick={() => setPreviewImageModal(null)}
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-md max-h-[80vh] relative">
            <img
              src={previewImageModal}
              alt="Custom Picture"
              className="max-w-full max-h-[80vh] object-contain rounded-2xl border border-wa-border"
            />
            <button
              onClick={() => setPreviewImageModal(null)}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
