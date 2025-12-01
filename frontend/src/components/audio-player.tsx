"use client";

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import { TimelineEntry } from "@/types/meeting";

export type AudioPlayerRef = {
  seekTo: (time: number) => void;
  currentTime: number;
  isPlaying: boolean;
};

type AudioPlayerProps = {
  audioUrl: string;
  transcript: TimelineEntry[];
  onTimeUpdate?: (currentTime: number) => void;
};

export const AudioPlayer = forwardRef<AudioPlayerRef, AudioPlayerProps>(
  ({ audioUrl, transcript, onTimeUpdate }, ref) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useImperativeHandle(ref, () => ({
      seekTo: (time: number) => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = time;
        setCurrentTime(time);
      },
      currentTime,
      isPlaying,
    }));

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
      onTimeUpdate?.(audio.currentTime);
    };

    const updateDuration = () => {
      setDuration(audio.duration);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [onTimeUpdate]);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  };

    const handleSeek = (time: number) => {
      const audio = audioRef.current;
      if (!audio) return;

      audio.currentTime = time;
      setCurrentTime(time);
    };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    handleSeek(newTime);
  };

  return (
    <div className="card space-y-4">
      <h3 className="text-lg font-semibold text-[var(--text)]">File âm thanh</h3>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      <div className="space-y-3">
        <div
          className="relative h-2 w-full cursor-pointer rounded-full bg-[var(--border)]"
          onClick={handleProgressClick}
        >
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-[var(--primary)] transition-all"
            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-sm text-[var(--muted)]">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePlayPause}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)] text-white transition hover:bg-[var(--primary-dark)]"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg
                className="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
          <div className="flex-1 text-sm text-[var(--text)]">
            {isPlaying ? "Đang phát" : "Tạm dừng"}
          </div>
        </div>
      </div>
    </div>
  );
  }
);

AudioPlayer.displayName = "AudioPlayer";

