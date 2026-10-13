import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  MoreVertical,
  Phone,
  Video as VideoIcon,
  Smile,
  Paperclip,
  Mic,
  Send,
  Zap,
  Check,
  CheckCheck,
  Play,
  Pause,
  Image as ImageIcon,
  FileText,
  X,
  Volume2,
  Trash2
} from 'lucide-react';
import AudioRecorder from './AudioRecorder';

export default function ChatWindow({
  contact,
  waNumberId,
  messages = [],
  quickReplies = [],
  onBack,
  onSendMessage,
  onSendMedia,
  onSendQuickReply,
  onDeleteChat
}) {
  const [inputText, setInputText] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [quickReplyFilter, setQuickReplyFilter] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [audioSpeed, setAudioSpeed] = useState(1);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioElementsRef = useRef({});

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle typing '/' for quick replies
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    if (val.startsWith('/')) {
      const query = val.toLowerCase();
      const matches = quickReplies.filter(
        (q) => q.name.toLowerCase().startsWith(query) || q.title.toLowerCase().includes(query.replace('/', ''))
      );
      setQuickReplyFilter(matches.length > 0 ? matches : null);
    } else {
      setQuickReplyFilter(null);
    }
  };

  const handleSendText = () => {
    if (!inputText.trim()) return;

    // Check if user typed an exact quick reply command like "/cars"
    const trimmed = inputText.trim();
    const matchedQr = quickReplies.find((q) => q.name.toLowerCase() === trimmed.toLowerCase());

    if (matchedQr) {
      onSendQuickReply(matchedQr.id);
      setInputText('');
      setQuickReplyFilter(null);
      return;
    }

    onSendMessage(trimmed);
    setInputText('');
    setQuickReplyFilter(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  // Attachment upload handler
  const handleFileChange = (e, mediaType = 'image') => {
    const file = e.target.files?.[0];
    if (!file) return;

    onSendMedia(file, mediaType);
    setShowAttachMenu(false);
    e.target.value = '';
  };

  // Voice note recorded via browser MediaRecorder
  const handleVoiceRecorded = (blob, duration) => {
    setIsRecordingVoice(false);
    const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: blob.type || 'audio/webm' });
    onSendMedia(file, 'voice');
  };

  // Audio Playback toggle
  const togglePlayAudio = (msgId, url) => {
    if (playingAudioId === msgId) {
      audioElementsRef.current[msgId]?.pause();
      setPlayingAudioId(null);
    } else {
      if (playingAudioId && audioElementsRef.current[playingAudioId]) {
        audioElementsRef.current[playingAudioId].pause();
      }
      let audio = audioElementsRef.current[msgId];
      if (!audio) {
        audio = new Audio(url);
        audioElementsRef.current[msgId] = audio;
        audio.onended = () => setPlayingAudioId(null);
      }
      audio.playbackRate = audioSpeed;
      audio.play().catch(e => console.warn('Audio play error:', e));
      setPlayingAudioId(msgId);
    }
  };

  const toggleSpeed = (msgId) => {
    const speeds = [1, 1.5, 2];
    const nextIdx = (speeds.indexOf(audioSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setAudioSpeed(nextSpeed);
    if (audioElementsRef.current[msgId]) {
      audioElementsRef.current[msgId].playbackRate = nextSpeed;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-wa-dark select-none relative overflow-hidden">
      {/* 1. Chat Top Header */}
      <div className="sticky top-0 z-30 bg-wa-header px-3 py-2 flex items-center justify-between border-b border-wa-border/80 shadow-md">
        <div className="flex items-center space-x-2 min-w-0">
          <button
            onClick={onBack}
            className="p-1 -ml-1 text-wa-muted hover:text-wa-text rounded-full active:scale-95 transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-wa-green" />
          </button>

          <div className="w-9 h-9 rounded-full bg-wa-teal/30 border border-wa-green/30 flex items-center justify-center font-bold text-xs text-wa-text flex-shrink-0">
            {(contact.name || contact.phone || 'WA').substring(0, 2).toUpperCase()}
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-wa-text truncate leading-snug">
              {contact.name || contact.phone}
            </h2>
            <p className="text-[11px] text-wa-muted truncate">
              via <span className="text-wa-green font-semibold">{waNumberId}</span> • Online
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1 text-wa-muted">
          <button
            onClick={() => setQuickReplyFilter(quickReplies)}
            title="Quick Replies"
            className="p-1.5 hover:text-wa-green rounded-full hover:bg-wa-subtle transition-colors"
          >
            <Zap className="w-5 h-5 text-amber-400" />
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Delete chat with "${contact.name || contact.phone}" and remove all messages?`)) {
                onDeleteChat(contact.jid);
              }
            }}
            title="Delete This Chat"
            className="p-1.5 hover:text-red-400 rounded-full hover:bg-red-500/10 transition-colors text-wa-muted"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
          <button className="p-1.5 hover:text-wa-text rounded-full hover:bg-wa-subtle transition-colors">
            <Phone className="w-4 h-4" />
          </button>
          <button className="p-1.5 hover:text-wa-text rounded-full hover:bg-wa-subtle transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Messages Bubble History (WhatsApp doodle theme) */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2.5 wa-chat-bg">
        {/* Date Stamp */}
        <div className="flex justify-center my-2">
          <span className="px-3 py-1 rounded-lg bg-wa-header text-wa-muted text-[11px] font-medium shadow-sm border border-wa-border/50">
            TODAY
          </span>
        </div>

        {messages.map((msg) => {
          const isMe = msg.fromMe;
          const time = new Date(msg.timestamp || Date.now()).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          });

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
            >
              <div
                className={`max-w-[82%] rounded-2xl px-3 py-2 text-xs relative shadow-md transition-all ${
                  isMe
                    ? 'bg-wa-bubble-out text-white rounded-br-xs'
                    : 'bg-wa-bubble-in text-wa-text rounded-bl-xs'
                }`}
              >
                {/* Media Image Rendering */}
                {msg.type === 'image' && (
                  <div className="mb-1 rounded-xl overflow-hidden bg-black/20">
                    <img
                      src={msg.mediaUrl || '/uploads/quick-replies/car1.jpg'}
                      alt="Attachment"
                      className="w-full max-h-60 object-cover rounded-lg"
                    />
                  </div>
                )}

                {/* Media Video Rendering */}
                {msg.type === 'video' && (
                  <div className="mb-1 rounded-xl overflow-hidden bg-black/40">
                    <video
                      src={msg.videoUrl || msg.mediaUrl}
                      controls
                      className="w-full max-h-60 rounded-lg"
                    />
                  </div>
                )}

                {/* Media Audio / Voice Note Rendering */}
                {msg.type === 'audio' && (
                  <div className="flex items-center space-x-2.5 py-1 min-w-[200px]">
                    <button
                      onClick={() => togglePlayAudio(msg.id, msg.audioUrl || '/uploads/sample-voice.mp3')}
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-wa-dark shadow-sm active:scale-95 transition-all ${
                        isMe ? 'bg-white text-wa-dark' : 'bg-wa-green text-wa-dark'
                      }`}
                    >
                      {playingAudioId === msg.id ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>

                    {/* Waveform Visualization Bars */}
                    <div className="flex-1 flex items-center space-x-1 h-5">
                      <span className={`w-1 rounded-full ${playingAudioId === msg.id ? 'bg-wa-green animate-wave-1' : 'bg-wa-muted/60 h-2'}`}></span>
                      <span className={`w-1 rounded-full ${playingAudioId === msg.id ? 'bg-wa-green animate-wave-2' : 'bg-wa-muted/60 h-4'}`}></span>
                      <span className={`w-1 rounded-full ${playingAudioId === msg.id ? 'bg-wa-green animate-wave-3' : 'bg-wa-muted/60 h-3'}`}></span>
                      <span className={`w-1 rounded-full ${playingAudioId === msg.id ? 'bg-wa-green animate-wave-4' : 'bg-wa-muted/60 h-5'}`}></span>
                      <span className={`w-1 rounded-full ${playingAudioId === msg.id ? 'bg-wa-green animate-wave-2' : 'bg-wa-muted/60 h-2'}`}></span>
                    </div>

                    <button
                      onClick={() => toggleSpeed(msg.id)}
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/20 text-white/90 hover:bg-black/30"
                    >
                      {audioSpeed}x
                    </button>
                  </div>
                )}

                {/* Media Document Rendering */}
                {msg.type === 'document' && (
                  <div className="flex items-center space-x-2.5 p-2 bg-black/20 rounded-xl mb-1">
                    <div className="w-8 h-8 rounded-lg bg-wa-header flex items-center justify-center text-wa-green">
                      <FileText className="w-4 h-4 text-wa-green" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-white truncate">
                        {msg.fileName || msg.text || 'Document.pdf'}
                      </p>
                      <span className="text-[10px] text-white/70">Tap to download</span>
                    </div>
                  </div>
                )}

                {/* Text Message Content */}
                {msg.text && (
                  <p className="whitespace-pre-wrap break-words leading-relaxed text-xs">
                    {msg.text}
                  </p>
                )}

                {/* Timestamp & Delivery Status */}
                <div className="flex items-center justify-end space-x-1 mt-1 text-[10px] text-white/60">
                  <span>{time}</span>
                  {isMe && (
                    <span>
                      {msg.status === 'read' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
                      ) : msg.status === 'delivered' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-white/80" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-white/80" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Quick Reply Suggestion Dropdown Popover */}
      {quickReplyFilter && quickReplyFilter.length > 0 && (
        <div className="absolute bottom-16 left-3 right-3 max-h-56 overflow-y-auto bg-wa-panel border border-wa-green/40 rounded-2xl shadow-2xl z-40 p-1.5 divide-y divide-wa-border">
          <div className="px-2.5 py-1 flex items-center justify-between text-[11px] font-bold text-wa-green">
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              QUICK REPLY TEMPLATES
            </span>
            <button
              onClick={() => setQuickReplyFilter(null)}
              className="text-wa-muted hover:text-wa-text"
            >
              ✕
            </button>
          </div>

          {quickReplyFilter.map((qr) => (
            <div
              key={qr.id}
              onClick={() => {
                setPreviewTemplate(qr);
                setQuickReplyFilter(null);
              }}
              className="p-2 hover:bg-wa-subtle rounded-xl cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-wa-green">{qr.name}</span>
                <span className="text-[10px] text-wa-muted">
                  {qr.media?.length > 0 ? `${qr.media.length} media items` : 'Text only'}
                </span>
              </div>
              <p className="text-xs text-wa-text font-medium truncate mt-0.5">{qr.title}</p>
              {qr.text && (
                <p className="text-[11px] text-wa-muted truncate mt-0.5">{qr.text}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 4. Quick Reply Preview & Send Modal */}
      {previewTemplate && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col justify-end p-3 animate-fade-in">
          <div className="bg-wa-panel rounded-2xl border border-wa-border p-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3 border-b border-wa-border pb-2">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-wa-green">{previewTemplate.name}</h3>
                  <p className="text-xs text-wa-muted">{previewTemplate.title}</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="p-1 rounded-full text-wa-muted hover:text-wa-text hover:bg-wa-subtle"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Media Items in this Template */}
            {previewTemplate.media && previewTemplate.media.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-wa-text mb-2">
                  Media to send ({previewTemplate.media.length}):
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {previewTemplate.media.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-wa-header border border-wa-border flex items-center space-x-2"
                    >
                      {item.type === 'image' && <ImageIcon className="w-4 h-4 text-wa-green" />}
                      {item.type === 'video' && <VideoIcon className="w-4 h-4 text-wa-green" />}
                      {(item.type === 'audio' || item.type === 'voice') && (
                        <Volume2 className="w-4 h-4 text-amber-400" />
                      )}
                      <span className="text-[11px] text-wa-text truncate font-medium">
                        {item.name || item.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Template Text */}
            {previewTemplate.text && (
              <div className="p-3 rounded-xl bg-wa-dark border border-wa-border/70 mb-4 text-xs text-wa-text whitespace-pre-wrap">
                {previewTemplate.text}
              </div>
            )}

            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 rounded-xl bg-wa-header text-xs text-wa-muted hover:text-wa-text font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onSendQuickReply(previewTemplate.id);
                  setPreviewTemplate(null);
                  setInputText('');
                }}
                className="px-5 py-2 rounded-xl bg-wa-green text-wa-dark text-xs font-bold hover:bg-wa-teal active:scale-95 transition-all flex items-center gap-1.5 shadow-md"
              >
                <Send className="w-4 h-4" />
                Send All Template Items
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Attachment Menu Popover */}
      {showAttachMenu && (
        <div className="absolute bottom-16 left-3 bg-wa-panel border border-wa-border rounded-2xl shadow-xl p-2 z-40 flex flex-col space-y-1 w-44">
          <label className="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-wa-subtle cursor-pointer text-xs text-wa-text transition-colors">
            <ImageIcon className="w-4 h-4 text-cyan-400" />
            <span>Image / Photo</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, 'image')}
            />
          </label>

          <label className="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-wa-subtle cursor-pointer text-xs text-wa-text transition-colors">
            <VideoIcon className="w-4 h-4 text-purple-400" />
            <span>Video</span>
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, 'video')}
            />
          </label>

          <label className="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-wa-subtle cursor-pointer text-xs text-wa-text transition-colors">
            <Volume2 className="w-4 h-4 text-amber-400" />
            <span>Audio File</span>
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, 'audio')}
            />
          </label>

          <label className="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-wa-subtle cursor-pointer text-xs text-wa-text transition-colors">
            <FileText className="w-4 h-4 text-blue-400" />
            <span>Document</span>
            <input
              type="file"
              accept="*/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, 'document')}
            />
          </label>
        </div>
      )}

      {/* 6. Bottom Input Bar / Audio Recorder */}
      <div className="p-2 bg-wa-header border-t border-wa-border/80 relative z-20">
        {isRecordingVoice ? (
          <AudioRecorder
            onRecordingComplete={handleVoiceRecorded}
            onCancel={() => setIsRecordingVoice(false)}
          />
        ) : (
          <div className="flex items-center space-x-1.5">
            {/* Attachment Button */}
            <button
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className="p-2 text-wa-muted hover:text-wa-text active:scale-95 transition-all"
              title="Attach File"
            >
              <Paperclip className="w-5 h-5 rotate-45 text-wa-muted hover:text-wa-green" />
            </button>

            {/* Quick Reply Shortcut Button */}
            <button
              onClick={() => setQuickReplyFilter(quickReplies)}
              className="p-2 text-wa-muted hover:text-amber-400 active:scale-95 transition-all"
              title="Quick Replies (/cars)"
            >
              <Zap className="w-5 h-5 text-amber-400" />
            </button>

            {/* Input pill */}
            <div className="flex-1 bg-wa-input rounded-2xl flex items-center px-3 py-1.5 border border-wa-border/40 focus-within:border-wa-green/40 transition-colors">
              <input
                type="text"
                placeholder="Type a message or / for templates..."
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent text-xs text-wa-text placeholder-wa-muted/70 focus:outline-none"
              />
            </div>

            {/* Send or Voice Note Record */}
            {inputText.trim() ? (
              <button
                onClick={handleSendText}
                className="w-10 h-10 rounded-full bg-wa-green text-wa-dark flex items-center justify-center active:scale-95 transition-transform shadow-md"
                title="Send Message"
              >
                <Send className="w-4 h-4 text-wa-dark ml-0.5" />
              </button>
            ) : (
              <button
                onClick={() => setIsRecordingVoice(true)}
                className="w-10 h-10 rounded-full bg-wa-green text-wa-dark flex items-center justify-center active:scale-95 transition-transform shadow-md"
                title="Record Voice Note"
              >
                <Mic className="w-5 h-5 text-wa-dark" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
