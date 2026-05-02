"use client";

import { useState, useRef, useCallback } from 'react';

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCanceledRef = useRef(false);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    isCanceledRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error("Stop recorder error:", e);
      }
    }
    stopStream();
    setIsRecording(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [stopStream]);

  const startRecording = useCallback(async (): Promise<Promise<Blob>> => {
    isCanceledRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Critical check: if user canceled while permission dialog was open
      if (isCanceledRef.current) {
        stream.getTracks().forEach(t => t.stop());
        throw new Error("Kayıt iptal edildi.");
      }

      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;
      
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const resultPromise = new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          resolve(blob);
        };
      });

      recorder.start();
      setIsRecording(true);

      // Auto-stop after 7 seconds
      timeoutRef.current = setTimeout(() => {
        stopRecording();
      }, 7000);

      return resultPromise;

    } catch (err: any) {
      if (err.message !== "Kayıt iptal edildi.") {
        console.error("Recording error:", err);
        throw new Error("Mikrofon erişimi reddedildi.");
      }
      throw err;
    }
  }, [stopRecording]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    stopStream
  };
}
