import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, RefreshCw, Search, User } from "lucide-react";
import { meetingsService } from "../../../services/meetings.service";
import { Meeting, MeetingStatus } from "../../../types/Meeting.type";
import { toast } from "sonner";
import { AudioWaveform, AudioPlayer } from "../../../components";
import { RightPanel } from "../../../components/common/RightPanel";

const MeetingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const fetchMeeting = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await meetingsService.getById(id);
      setMeeting(data);

      // Load audio URL
      if (
        data.status === MeetingStatus.COMPLETED &&
        data.uploads &&
        data.uploads.length > 0
      ) {
        try {
          const blob = await meetingsService.getAudio(id);
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
        } catch (error) {
          console.error("Failed to load audio:", error);
        }
      }
    } catch (error: any) {
      console.error("Error fetching meeting:", error);
      toast.error("Failed to load meeting", {
        description: error?.response?.data?.message || error.message,
      });
      navigate("/meetings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchMeeting();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    // Poll for status updates if processing
    if (!meeting || meeting.status !== MeetingStatus.PROCESSING || !id) return;

    const interval = setInterval(() => {
      meetingsService
        .getStatus(id)
        .then((status) => {
          if (status.status !== MeetingStatus.PROCESSING) {
            fetchMeeting();
          }
        })
        .catch(() => {
          // Ignore errors during polling
        });
    }, 5000);

    return () => {
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, meeting?.status]);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const handleDownloadAudio = async () => {
    if (!meeting) return;

    try {
      toast.loading("Downloading audio...", { id: "download" });
      await meetingsService.downloadAudio(meeting.id, meeting.title);
      toast.success("Audio downloaded successfully", { id: "download" });
    } catch (error: any) {
      toast.error("Failed to download audio", {
        id: "download",
        description: error?.response?.data?.message || error.message,
      });
    }
  };

  // Calculate progress and duration
  const progressData = useMemo(() => {
    if (!meeting)
      return { progress: 0, totalDuration: 0, processedDuration: 0 };

    // Get total duration from uploads or calculate from rawTranscript
    let totalDuration = 0;
    if (
      meeting.uploads &&
      meeting.uploads.length > 0 &&
      meeting.uploads[0].durationSeconds
    ) {
      totalDuration = meeting.uploads[0].durationSeconds;
    } else if (meeting.rawTranscript && meeting.rawTranscript.length > 0) {
      totalDuration = Math.max(
        ...meeting.rawTranscript.map((entry) => entry.end || 0)
      );
    }

    // Calculate processed duration from completed segments or rawTranscript
    let processedDuration = 0;
    if (meeting.totalSegments > 0) {
      processedDuration =
        (meeting.completedSegments / meeting.totalSegments) * totalDuration;
    } else if (meeting.rawTranscript && meeting.rawTranscript.length > 0) {
      processedDuration = Math.max(
        ...meeting.rawTranscript.map((entry) => entry.end || 0)
      );
    }

    const progress =
      totalDuration > 0 ? (processedDuration / totalDuration) * 100 : 0;

    return {
      progress: Math.round(progress),
      totalDuration,
      processedDuration,
    };
  }, [meeting]);

  // Filter transcript based on search
  const filteredTranscript = useMemo(() => {
    if (!meeting) return [];
    const transcript = meeting.formattedLines || meeting.rawTranscript || [];
    if (!searchQuery.trim()) return transcript;

    const query = searchQuery.toLowerCase();
    return transcript.filter(
      (entry) =>
        entry.text.toLowerCase().includes(query) ||
        entry.speaker.toLowerCase().includes(query)
    );
  }, [meeting, searchQuery]);

  // Get highlights from extra
  const highlights = useMemo(() => {
    if (!meeting?.extra?.highlights) return [];
    return meeting.extra.highlights as Array<{
      transcriptIndex: number;
      text: string;
    }>;
  }, [meeting]);

  const formatMinutes = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTimeMMSS = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleTimeUpdate = (time: number, dur: number) => {
    setCurrentTime(time);
    setDuration(dur);
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
  };

  const handleTranscriptClick = (entry: {
    start?: number;
    end?: number;
    timestamp?: string;
  }) => {
    if (entry.start !== undefined) {
      handleSeek(entry.start);
    } else if (entry.timestamp) {
      // Try to parse timestamp if start is not available
      const timeMatch = entry.timestamp.match(/(\d+):(\d+)/);
      if (timeMatch) {
        const minutes = parseInt(timeMatch[1], 10);
        const seconds = parseInt(timeMatch[2], 10);
        handleSeek(minutes * 60 + seconds);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Meeting not found</p>
        <button
          onClick={() => navigate("/meetings")}
          className="mt-4 text-emerald-600 hover:text-emerald-700"
        >
          Back to Meetings
        </button>
      </div>
    );
  }

  const transcript = meeting.formattedLines || meeting.rawTranscript || [];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate("/meetings")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {meeting.title || "Untitled Meeting"}
            </h1>
          </div>
        </div>
        {meeting.status === MeetingStatus.COMPLETED &&
          meeting.uploads &&
          meeting.uploads.length > 0 && (
            <button
              onClick={handleDownloadAudio}
              className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
          )}
      </div>

      {/* Top Section: Progress, Legend, Minutes, Search */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-8">
          {/* Progress Indicator */}
          <div className="flex items-center space-x-4">
            {/* Progress circle + Completed (dọc) */}
            <div className="flex flex-col items-center space-y-2">
              <div className="relative w-16 h-16">
                <svg className="transform -rotate-90 w-16 h-16">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="#e5e7eb"
                    strokeWidth="4"
                    fill="none"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="#f97316"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={`${
                      2 * Math.PI * 28 * (1 - progressData.progress / 100)
                    }`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-orange-600">
                    {progressData.progress}%
                  </span>
                </div>
              </div>
              <div className="text-sm text-center">
                <div className="font-semibold text-gray-900">Completed</div>
              </div>
            </div>
            {/* Legend (dọc bên phải) */}
            <div className="flex flex-col space-y-2">
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <span className="text-xs text-gray-600">Lost</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-xs text-gray-600">Listened</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 rounded-full bg-teal-500" />
                <span className="text-xs text-gray-600">Not processed</span>
              </div>
            </div>
          </div>

          {/* Waveform Icon + Minutes */}
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 flex items-center justify-center">
              <div className="flex space-x-0.5">
                {[0.3, 0.7, 0.5, 0.9, 0.4, 0.6, 0.8, 0.5].map((height, i) => (
                  <div
                    key={i}
                    className="w-0.5 bg-orange-500"
                    style={{ height: `${height * 20}px` }}
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-gray-900">
                {formatTimeMMSS(progressData.processedDuration)}
              </span>
              <span className="text-xs text-gray-500">Minutes processed</span>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search transcript"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Main Content Area (swapped): RightPanel on the left, main content on the right */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Right Panel (fills remaining space) */}
        {meeting.status === MeetingStatus.COMPLETED && (
          <div className="flex-1 border-r border-gray-200 overflow-y-auto">
            <RightPanel meeting={meeting} onUpdate={fetchMeeting} />
          </div>
        )}

        {/* Right: Waveform + Transcript (main content set to 1/3 width) */}
        <div className="w-1/3 flex-shrink-0 flex flex-col overflow-hidden">
          {/* Audio Waveform */}
          {meeting.status === MeetingStatus.COMPLETED && (
            <div className="p-4 border-b border-gray-200">
              <AudioWaveform
                duration={duration || progressData.totalDuration}
                currentTime={currentTime}
                onSeek={handleSeek}
              />
            </div>
          )}

          {/* Transcript */}
          <div className="flex-1 overflow-y-auto p-4 pb-24">
            {filteredTranscript.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                {searchQuery ? "No results found" : "No transcript available"}
              </div>
            ) : (
              <div className="space-y-1 max-w-xl mx-auto">
                {filteredTranscript.map((entry, index) => {
                  const isHighlighted = highlights.some(
                    (h) => h.transcriptIndex === index
                  );
                  const searchMatch = searchQuery.trim()
                    ? entry.text
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                    : false;
                  const hasTimeData =
                    "start" in entry && entry.start !== undefined;

                  return (
                    <div
                      key={index}
                      onClick={() =>
                        hasTimeData
                          ? handleTranscriptClick(
                              entry as {
                                start?: number;
                                end?: number;
                                timestamp?: string;
                              }
                            )
                          : undefined
                      }
                      className={`p-3 rounded transition-colors ${
                        hasTimeData ? "cursor-pointer hover:bg-gray-50" : ""
                      } ${isHighlighted ? "bg-yellow-50" : "bg-white"}`}
                    >
                      {/* Compact Header: Speaker and Timestamp inline */}
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-semibold text-gray-800">
                          {entry.speaker}
                        </span>
                        {entry.timestamp && (
                          <span className="text-xs text-gray-500 font-mono">
                            {entry.timestamp}
                          </span>
                        )}
                      </div>

                      {/* Text Content - no extra padding */}
                      <p className="text-sm text-gray-900 leading-relaxed break-words">
                        {searchMatch && searchQuery.trim()
                          ? entry.text
                              .split(new RegExp(`(${searchQuery})`, "gi"))
                              .map((part, i) =>
                                part.toLowerCase() ===
                                searchQuery.toLowerCase() ? (
                                  <mark
                                    key={i}
                                    className="bg-yellow-300 px-0.5 rounded"
                                  >
                                    {part}
                                  </mark>
                                ) : (
                                  part
                                )
                              )
                          : entry.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Audio Player Controls */}
      {meeting.status === MeetingStatus.COMPLETED && audioUrl && (
        <AudioPlayer
          audioUrl={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onSeek={handleSeek}
          externalCurrentTime={currentTime}
        />
      )}
    </div>
  );
};

export default MeetingDetail;
