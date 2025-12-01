import React, { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  waveformData?: number[];
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  duration,
  currentTime,
  onSeek,
  waveformData,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = 80;
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Generate waveform data if not provided
    const data = waveformData || Array.from({ length: 200 }, () => Math.random() * 0.8 + 0.2);

    const barWidth = width / data.length;
    const currentPosition = duration > 0 ? (currentTime / duration) * width : 0;

    // Draw waveform bars
    data.forEach((value, index) => {
      const x = index * barWidth;
      const barHeight = value * height * 0.8;
      const y = (height - barHeight) / 2;

      // Color: orange if before current position, teal otherwise
      const isPlayed = x < currentPosition;
      ctx.fillStyle = isPlayed ? '#f97316' : '#14b8a6';
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    });

    // Draw current position indicator
    if (currentPosition > 0) {
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(currentPosition, 0);
      ctx.lineTo(currentPosition, height);
      ctx.stroke();
    }
  }, [duration, currentTime, waveformData]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || duration === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / canvas.width;
    const newTime = percentage * duration;
    onSeek(newTime);
  };

  return (
    <div ref={containerRef} className="w-full">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="w-full cursor-pointer"
        style={{ height: '80px' }}
      />
    </div>
  );
};

