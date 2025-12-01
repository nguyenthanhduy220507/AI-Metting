"use client";

import { useRef, useState, useEffect } from "react";
import { TimelineEntry } from "@/types/meeting";
import { AudioPlayer, AudioPlayerRef } from "./audio-player";
import clsx from "clsx";

type TimelineWithAudioProps = {
  audioUrl: string;
  transcript: TimelineEntry[];
};

export function TimelineWithAudio({ audioUrl, transcript }: TimelineWithAudioProps) {
  const audioPlayerRef = useRef<AudioPlayerRef>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const highlightedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Find which transcript entry should be highlighted based on currentTime
    const activeIndex = transcript.findIndex((entry) => {
      const start = entry.start ?? 0;
      const end = entry.end ?? start + 1;
      return currentTime >= start && currentTime < end;
    });

    if (activeIndex !== -1 && activeIndex !== highlightedIndex) {
      setHighlightedIndex(activeIndex);
      // Auto-scroll to highlighted entry
      if (highlightedRef.current) {
        highlightedRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    } else if (activeIndex === -1) {
      setHighlightedIndex(null);
    }
  }, [currentTime, transcript, highlightedIndex]);

  const handleTranscriptClick = (entry: TimelineEntry) => {
    const startTime = entry.start ?? 0;
    audioPlayerRef.current?.seekTo(startTime);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      {/* Audio Player - Sticky */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <AudioPlayer
          ref={audioPlayerRef}
          audioUrl={audioUrl}
          transcript={transcript}
          onTimeUpdate={setCurrentTime}
        />
      </div>

      {/* Timeline Transcript */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--text)]">Timeline phát biểu</h2>
        <div className="space-y-3 text-sm">
          {transcript.length ? (
            transcript.map((line, index) => {
              const isHighlighted = highlightedIndex === index;
              return (
                <div
                  key={`${line.timestamp}-${index}`}
                  ref={isHighlighted ? highlightedRef : null}
                  onClick={() => handleTranscriptClick(line)}
                  className={clsx(
                    "cursor-pointer rounded-2xl border p-4 transition-all",
                    isHighlighted
                      ? "border-[var(--primary)] bg-[var(--accent)]/10 shadow-md"
                      : "border-[var(--border)] bg-white hover:border-[var(--primary)]/50"
                  )}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                    {line.timestamp ?? "00:00"}
                  </p>
                  <p className="mt-1 font-semibold text-[var(--text)]">{line.speaker}</p>
                  <p className="text-[var(--muted)]">{line.text}</p>
                </div>
              );
            })
          ) : (
            <p className="text-[var(--muted)]">
              Chưa có transcript format cho cuộc họp này.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

