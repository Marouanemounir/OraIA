"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface UseVoiceRecorderReturn {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  isRecording: boolean;
  audioLevel: number;
  hasPermission: boolean | null;
  requestPermission: () => Promise<boolean>;
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const resolveStopRef = useRef<((blob: Blob | null) => void) | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.fftSize);
    analyserRef.current.getByteTimeDomainData(data);

    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    setAudioLevel(Math.min(100, Math.round(rms * 300)));

    if (isRecording) {
      animFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  }, [isRecording]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setHasPermission(true);
      return true;
    } catch {
      setHasPermission(false);
      return false;
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!streamRef.current) {
      const granted = await requestPermission();
      if (!granted) return;
    }

    const stream = streamRef.current!;
    chunksRef.current = [];

    // Setup analyser for audio level
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    // Start MediaRecorder
    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      resolveStopRef.current?.(blob);
      resolveStopRef.current = null;
    };

    mediaRecorderRef.current = recorder;
    recorder.start(100);
    setIsRecording(true);

    // Start level monitoring
    animFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, [requestPermission, updateAudioLevel]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      cancelAnimationFrame(animFrameRef.current);
      setAudioLevel(0);

      if (
        !mediaRecorderRef.current ||
        mediaRecorderRef.current.state === "inactive"
      ) {
        setIsRecording(false);
        resolve(null);
        return;
      }

      resolveStopRef.current = resolve;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    });
  }, []);

  return {
    startRecording,
    stopRecording,
    isRecording,
    audioLevel,
    hasPermission,
    requestPermission,
  };
}
