import React, { useRef, useEffect, useState } from 'react';
import { Pause, Play, SkipBack, SkipForward, Edit, Send } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onSeek?: (time: number) => void;
  externalCurrentTime?: number;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  onTimeUpdate,
  onSeek,
  externalCurrentTime,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      const time = audio.currentTime;
      setCurrentTime(time);
      onTimeUpdate?.(time, audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl, onTimeUpdate]);

  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      setIsLoading(true);
    }
  }, [audioUrl]);

  // Sync external currentTime with audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || externalCurrentTime === undefined) return;
    
    const diff = Math.abs(audio.currentTime - externalCurrentTime);
    if (diff > 0.5) {
      audio.currentTime = externalCurrentTime;
      setCurrentTime(externalCurrentTime);
    }
  }, [externalCurrentTime]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = time;
    setCurrentTime(time);
    onSeek?.(time);
  };

  const handleRewind = () => {
    const audio = audioRef.current;
    if (!audio) return;
    handleSeek(Math.max(0, currentTime - 10));
  };

  const handleFastForward = () => {
    const audio = audioRef.current;
    if (!audio) return;
    handleSeek(Math.min(duration, currentTime + 10));
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    handleSeek(percentage * duration);
  };

  return (
    <div className="fixed bottom-0 left-0 lg:left-64 right-0 z-50 flex items-center space-x-4 p-4 bg-white border-t border-gray-200 shadow-lg">
      <audio ref={audioRef} preload="metadata" />
      
      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
        <Edit className="w-5 h-5 text-gray-600" />
      </button>

      <button
        onClick={handleRewind}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        title="Rewind 10s"
      >
        <SkipBack className="w-5 h-5 text-gray-600" />
      </button>

      <button
        onClick={togglePlayPause}
        disabled={isLoading}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 text-gray-600" />
        ) : (
          <Play className="w-5 h-5 text-gray-600" />
        )}
      </button>

      <button
        onClick={handleFastForward}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        title="Forward 10s"
      >
        <SkipForward className="w-5 h-5 text-gray-600" />
      </button>

      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
        <Send className="w-5 h-5 text-gray-600" />
      </button>

      <div className="flex-1 flex items-center space-x-2">
        <span className="text-sm text-gray-600 min-w-[50px]">{formatTime(currentTime)}</span>
        <div
          onClick={handleProgressClick}
          className="flex-1 h-2 bg-gray-200 rounded-full cursor-pointer relative"
        >
          <div
            className="h-full bg-emerald-600 rounded-full transition-all"
            style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
          />
        </div>
        <span className="text-sm text-gray-600 min-w-[50px]">{formatTime(duration)}</span>
      </div>
    </div>
  );
};

