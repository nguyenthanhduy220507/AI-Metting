import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, RotateCcw, Check, AlertCircle } from 'lucide-react';
import { trimSilence, convertToWav, analyzeAudio, blobToFile } from '../../utils/audioUtils';
import { AudioWaveform } from './AudioWaveform';
import { toast } from 'sonner';

interface RecordedSample {
  id: string;
  blob: Blob;
  file: File;
  waveform: number[];
  scriptIndex: number;
  duration: number;
}

interface LiveRecorderProps {
  onSamplesRecorded: (samples: File[]) => void;
  maxSamples?: number;
  minSamples?: number;
}

const SCRIPTS = [
  'Tôi muốn tạo một mẫu giọng nói thật rõ ràng, nên đang cố gắng giữ nhịp điệu ổn định và phát âm đầy đủ các âm cuối. Nếu có một vài tiếng động nhỏ xung quanh thì mong hệ thống vẫn có thể loại bỏ và giữ lại phần giọng chính xác nhất',
  'Hôm nay trời khá đẹp nên tôi quyết định dành một chút thời gian để thử tính năng ghi âm trực tiếp. Tôi đang nói với tốc độ vừa phải, âm lượng ổn định, để hệ thống có thể phân tích và xử lý giọng nói một cách tốt nhất',
];

type RecordingState = 'idle' | 'recording' | 'paused' | 'processing' | 'preview';

export const LiveRecorder: React.FC<LiveRecorderProps> = ({
  onSamplesRecorded,
  maxSamples = 5,
  minSamples = 2,
}) => {
  const [state, setState] = useState<RecordingState>('idle');
  const [recordedSamples, setRecordedSamples] = useState<RecordedSample[]>([]);
  const [currentScriptIndex, setCurrentScriptIndex] = useState(0);
  const [currentBlob, setCurrentBlob] = useState<Blob | null>(null);
  const [currentWaveform, setCurrentWaveform] = useState<number[]>([]);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Update samples when recordedSamples changes
  useEffect(() => {
    const files = recordedSamples.map((sample) => sample.file);
    onSamplesRecorded(files);
  }, [recordedSamples, onSamplesRecorded]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      source.connect(analyser);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setCurrentBlob(blob);
        setState('processing');

        try {
          // Convert to WAV and trim silence
          const wavBlob = await convertToWav(blob);
          const trimmedBlob = await trimSilence(wavBlob);
          
          // Analyze for waveform
          const waveform = await analyzeAudio(trimmedBlob);
          setCurrentWaveform(waveform);

          // Get duration
          const audio = new Audio(URL.createObjectURL(trimmedBlob));
          audio.addEventListener('loadedmetadata', () => {
            setRecordingDuration(audio.duration);
          });

          setCurrentBlob(trimmedBlob);
          setState('preview');
        } catch (error) {
          console.error('Error processing audio:', error);
          setState('idle');
        }
      };

      mediaRecorder.start();
      setState('recording');
      startTimeRef.current = Date.now();

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setRecordingDuration(elapsed);
      }, 100);

      // Start waveform visualization
      visualizeWaveform();
    } catch (error: any) {
      console.error('Error starting recording:', error);
      
      let errorMessage = 'Failed to access microphone. ';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage += 'Please allow microphone access in your browser settings and try again.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage += 'No microphone found. Please connect a microphone and try again.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage += 'Microphone is being used by another application. Please close other applications and try again.';
      } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        errorMessage += 'Microphone does not meet the required constraints.';
      } else {
        errorMessage += error.message || 'Please check your browser settings and try again.';
      }
      
      toast.error('Microphone Access Error', {
        description: errorMessage,
        duration: 5000,
      });
      setState('idle');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const visualizeWaveform = () => {
    const canvas = document.createElement('canvas');
    const canvasContext = canvas.getContext('2d');
    if (!canvasContext || !analyserRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (state !== 'recording') return;

      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      // Normalize and update waveform
      const normalized = Array.from(dataArray).map((value) => value / 255);
      setCurrentWaveform(normalized.slice(0, 200)); // Use first 200 bars
    };

    draw();
  };

  const saveSample = async () => {
    if (!currentBlob) return;

    const filename = `recording-${Date.now()}-${currentScriptIndex + 1}.wav`;
    const file = blobToFile(currentBlob, filename);

    const sample: RecordedSample = {
      id: Date.now().toString(),
      blob: currentBlob,
      file,
      waveform: currentWaveform,
      scriptIndex: currentScriptIndex,
      duration: recordingDuration,
    };

    setRecordedSamples((prev) => [...prev, sample]);
    setCurrentBlob(null);
    setCurrentWaveform([]);
    setRecordingDuration(0);
    setPlaybackTime(0);
    setState('idle');

    // Move to next script or cycle back
    if (recordedSamples.length + 1 < maxSamples) {
      setCurrentScriptIndex((prev) => (prev + 1) % SCRIPTS.length);
    }
  };

  const reRecord = () => {
    setCurrentBlob(null);
    setCurrentWaveform([]);
    setRecordingDuration(0);
    setPlaybackTime(0);
    setState('idle');
  };

  const deleteSample = (id: string) => {
    setRecordedSamples((prev) => prev.filter((sample) => sample.id !== id));
  };

  const handlePlayback = () => {
    if (!currentBlob || !audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const canRecordMore = recordedSamples.length < maxSamples;
  const hasEnoughSamples = recordedSamples.length >= minSamples;

  return (
    <div className="space-y-6">
      {/* Script Display */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-blue-800">
            Script {currentScriptIndex + 1} / {SCRIPTS.length}
          </span>
          <span className="text-sm text-blue-600">
            Sample {recordedSamples.length + 1} / {maxSamples}
          </span>
        </div>
        <p className="text-lg text-gray-900 leading-relaxed">
          {SCRIPTS[currentScriptIndex]}
        </p>
      </div>

      {/* Recording Controls */}
      <div className="flex items-center justify-center space-x-4">
        {state === 'idle' && (
          <button
            onClick={startRecording}
            disabled={!canRecordMore}
            className="flex items-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Mic className="w-5 h-5" />
            <span>Start Recording</span>
          </button>
        )}

        {state === 'recording' && (
          <button
            onClick={stopRecording}
            className="flex items-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Square className="w-5 h-5" />
            <span>Stop Recording ({formatTime(recordingDuration)})</span>
          </button>
        )}

        {state === 'processing' && (
          <div className="flex items-center space-x-2 px-6 py-3 bg-gray-400 text-white rounded-lg">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Processing...</span>
          </div>
        )}
      </div>

      {/* Waveform Visualization */}
      {(state === 'recording' || state === 'preview') && currentWaveform.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <AudioWaveform
            duration={recordingDuration}
            currentTime={playbackTime}
            onSeek={() => {}}
            waveformData={currentWaveform}
          />
        </div>
      )}

      {/* Preview Controls */}
      {state === 'preview' && currentBlob && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={handlePlayback}
              className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>
            <button
              onClick={reRecord}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Re-record</span>
            </button>
            <button
              onClick={saveSample}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Save Sample</span>
            </button>
          </div>
          <audio
            ref={audioRef}
            src={URL.createObjectURL(currentBlob)}
            onTimeUpdate={(e) => {
              const audio = e.currentTarget;
              setPlaybackTime(audio.currentTime);
            }}
            onEnded={() => {
              setIsPlaying(false);
              setPlaybackTime(0);
            }}
            className="hidden"
          />
          <p className="text-center text-sm text-gray-600">
            Duration: {formatTime(recordingDuration)}
          </p>
        </div>
      )}

      {/* Recorded Samples List */}
      {recordedSamples.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">
            Recorded Samples ({recordedSamples.length} / {maxSamples})
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recordedSamples.map((sample) => (
              <div
                key={sample.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {sample.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    Script {sample.scriptIndex + 1} • {formatTime(sample.duration)}
                  </p>
                </div>
                <button
                  onClick={() => deleteSample(sample.id)}
                  className="ml-4 p-1 hover:bg-red-100 rounded text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Messages */}
      {!canRecordMore && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            Maximum samples reached ({maxSamples}). You can delete samples to record more.
          </p>
        </div>
      )}

      {recordedSamples.length > 0 && recordedSamples.length < minSamples && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            Record at least {minSamples} samples for better recognition accuracy.
          </p>
        </div>
      )}

      {hasEnoughSamples && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">
            ✓ You have enough samples. You can record more or proceed to create the speaker.
          </p>
        </div>
      )}
    </div>
  );
};

