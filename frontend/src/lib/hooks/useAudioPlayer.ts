"use client";

import { useRef, useState, useCallback } from "react";

interface UseAudioPlayerReturn {
  playAudio: (blob: Blob) => Promise<void>;
  stop: () => void;
  isPlaying: boolean;
}

/**
 * Mocked audio player — will be connected to TTS in Sprint 7.
 * For now simulates playback duration.
 */
export function useAudioPlayer(): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const playAudio = useCallback(
    async (blob: Blob) => {
      stop();
      setIsPlaying(true);

      // Try to play real audio if possible, otherwise mock duration
      try {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(url);
        };
        audio.onerror = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(url);
        };
        await audio.play();
      } catch {
        // Mock: simulate 3s playback
        timeoutRef.current = setTimeout(() => setIsPlaying(false), 3000);
      }
    },
    [stop]
  );

  return { playAudio, stop, isPlaying };
}
