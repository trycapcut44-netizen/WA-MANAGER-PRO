import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send, Check } from 'lucide-react';

export default function AudioRecorder({ onRecordingComplete, onCancel, inline = false }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    startRecording();
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const startRecording = async () => {
    setErrorMessage(null);
    chunksRef.current = [];
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Audio recording not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Stop all audio tracks to turn off microphone indicator
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200); // 200ms slice
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone error:', err.message);
      setErrorMessage(err.message || 'Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSend = () => {
    if (audioBlob) {
      onRecordingComplete(audioBlob, recordingTime);
    } else if (errorMessage) {
      // Create a fallback sample voice note blob so demo works regardless of mic permissions!
      fetch('/uploads/sample-voice.mp3')
        .then((res) => res.blob())
        .then((blob) => {
          onRecordingComplete(blob, 3);
        })
        .catch(() => {
          onCancel();
        });
    }
  };

  const formatSeconds = (sec) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (errorMessage) {
    return (
      <div className="flex items-center justify-between px-3 py-2 bg-wa-header rounded-xl border border-wa-border">
        <div className="text-xs text-wa-muted">
          Mic unavailable. Send sample voice note?
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onCancel}
            className="p-1 text-wa-muted hover:text-wa-text text-xs"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            className="px-2 py-1 bg-wa-green text-wa-dark rounded-md text-xs font-bold"
          >
            Send Demo Audio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-wa-header rounded-xl border border-wa-green/30 shadow-md">
      {/* Left: Discard Button */}
      <button
        onClick={onCancel}
        className="p-2 text-wa-muted hover:text-wa-danger active:scale-95 transition-colors"
        title="Discard Voice Note"
      >
        <Trash2 className="w-5 h-5 text-red-400" />
      </button>

      {/* Middle: Recording animation and timer */}
      <div className="flex items-center space-x-3">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
        <div className="flex items-center space-x-1">
          <span className="w-1 h-3 bg-wa-green rounded-full animate-wave-1"></span>
          <span className="w-1 h-5 bg-wa-green rounded-full animate-wave-2"></span>
          <span className="w-1 h-2 bg-wa-green rounded-full animate-wave-3"></span>
          <span className="w-1 h-6 bg-wa-green rounded-full animate-wave-4"></span>
          <span className="w-1 h-4 bg-wa-green rounded-full animate-wave-2"></span>
        </div>
        <span className="text-sm font-mono font-medium text-wa-text">
          {formatSeconds(recordingTime)}
        </span>
      </div>

      {/* Right: Stop & Send */}
      <div className="flex items-center space-x-2">
        {isRecording ? (
          <button
            onClick={() => {
              stopRecording();
              setTimeout(handleSend, 300);
            }}
            className="w-9 h-9 rounded-full bg-wa-green text-wa-dark flex items-center justify-center font-bold active:scale-95 shadow-md"
            title="Send Voice Note"
          >
            <Send className="w-4 h-4 text-wa-dark ml-0.5" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            className="w-9 h-9 rounded-full bg-wa-green text-wa-dark flex items-center justify-center font-bold active:scale-95 shadow-md"
            title="Send"
          >
            <Check className="w-4 h-4 text-wa-dark" />
          </button>
        )}
      </div>
    </div>
  );
}
