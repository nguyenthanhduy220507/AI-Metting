import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Mic, 
  Square, 
  Play, 
  Pause, 
  RotateCcw, 
  Check,
  FileAudio,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { meetingsService } from '../../services/meetings.service';
import { AudioWaveform } from './AudioWaveform';
import { convertToWav, trimSilence, analyzeAudio, blobToFile } from '../../utils/audioUtils';

interface CreateMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Tab = 'upload' | 'record';
type RecordingState = 'idle' | 'recording' | 'processing' | 'preview';

export const CreateMeetingModal: React.FC<CreateMeetingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Upload tab states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Record tab states
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);

  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  // Cleanup on unmount or modal close
  useEffect(() => {
    if (!isOpen) {
      resetForm();
      cleanupRecording();
    }
    return () => {
      cleanupRecording();
    };
  }, [isOpen]);

  const resetForm = () => {
    setActiveTab('upload');
    setTitle('');
    setDescription('');
    setSelectedFile(null);
    setRecordedBlob(null);
    setRecordingState('idle');
    setRecordingDuration(0);
    setWaveform([]);
    setIsPlaying(false);
    setPlaybackTime(0);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const cleanupRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  // Upload Tab Handlers
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a', 'audio/ogg', 'audio/webm', 'audio/flac'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|ogg|webm|flac)$/i)) {
      toast.error('Invalid file type', {
        description: 'Please select a valid audio file (MP3, WAV, M4A, OGG, WEBM, FLAC)',
      });
      return;
    }

    // Validate file size (max 512MB)
    const maxSize = 512 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File too large', {
        description: 'Maximum file size is 512MB',
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !title.trim() || !description.trim()) {
      toast.error('Missing required fields', {
        description: 'Please fill in title, description, and select a file',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const meeting = await meetingsService.create(selectedFile, title.trim(), description.trim());
      toast.success('Meeting created successfully', {
        description: 'Your audio file is being processed',
      });
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Upload failed', {
        description: error?.response?.data?.message || error.message || 'Failed to upload audio file',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Record Tab Handlers
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
        setRecordingState('processing');

        try {
          // Convert to WAV and trim silence
          const wavBlob = await convertToWav(blob);
          const trimmedBlob = await trimSilence(wavBlob);
          
          // Analyze for waveform
          const waveformData = await analyzeAudio(trimmedBlob);
          setWaveform(waveformData);

          // Create audio URL
          const audioUrl = URL.createObjectURL(trimmedBlob);
          audioUrlRef.current = audioUrl;
          
          const audio = new Audio(audioUrl);
          audio.addEventListener('loadedmetadata', () => {
            setRecordingDuration(audio.duration);
          });
          audio.load();

          setRecordedBlob(trimmedBlob);
          setRecordingState('preview');
        } catch (error) {
          console.error('Processing error:', error);
          toast.error('Processing failed', {
            description: 'Failed to process recorded audio',
          });
          setRecordingState('idle');
        }
      };

      mediaRecorder.start();
      setRecordingState('recording');
      startTimeRef.current = Date.now();

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setRecordingDuration(elapsed);
      }, 100);

      // Start waveform visualization
      visualizeWaveform();
    } catch (error: any) {
      console.error('Recording error:', error);
      
      let errorMessage = 'Failed to access microphone. ';
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage += 'Please allow microphone access in your browser settings.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage += 'No microphone found.';
      } else {
        errorMessage += error.message || 'Please check your browser settings.';
      }
      
      toast.error('Microphone Access Error', {
        description: errorMessage,
      });
      setRecordingState('idle');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
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
    const analyser = analyserRef.current;
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (recordingState !== 'recording') return;

      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      // Normalize and update waveform
      const normalized = Array.from(dataArray).map((value) => value / 255);
      setWaveform(normalized.slice(0, 200));
    };

    draw();
  };

  const handlePlayback = async () => {
    if (!recordedBlob || !audioRef.current || !audioUrlRef.current) {
      toast.error('Cannot play audio', {
        description: 'Audio not ready for playback',
      });
      return;
    }

    const audioElement = audioRef.current;

    try {
      if (isPlaying) {
        audioElement.pause();
        setIsPlaying(false);
      } else {
        if (!audioElement.src || audioElement.src !== audioUrlRef.current) {
          audioElement.src = audioUrlRef.current;
          audioElement.load();
        }
        await audioElement.play();
        setIsPlaying(true);
      }
    } catch (error: any) {
      console.error('Playback error:', error);
      toast.error('Playback failed', {
        description: error.message || 'Failed to play audio',
      });
      setIsPlaying(false);
    }
  };

  const handleReRecord = () => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setRecordedBlob(null);
    setWaveform([]);
    setRecordingDuration(0);
    setPlaybackTime(0);
    setIsPlaying(false);
    setRecordingState('idle');
  };

  const handleCreateFromRecording = async () => {
    if (!recordedBlob || !title.trim() || !description.trim()) {
      toast.error('Missing required fields', {
        description: 'Please fill in title and description',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const filename = `recording-${Date.now()}.wav`;
      const file = blobToFile(recordedBlob, filename);
      
      const meeting = await meetingsService.create(file, title.trim(), description.trim());
      toast.success('Meeting created successfully', {
        description: 'Your recording is being processed',
      });
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Create error:', error);
      toast.error('Failed to create meeting', {
        description: error?.response?.data?.message || error.message || 'Failed to create meeting from recording',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create Meeting</h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'upload'
                ? 'text-emerald-600 border-b-2 border-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Upload className="w-4 h-4" />
              <span>Upload File</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('record')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'record'
                ? 'text-emerald-600 border-b-2 border-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Mic className="w-4 h-4" />
              <span>Live Record</span>
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {activeTab === 'upload' ? (
            // Upload Tab Content
            <>
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Audio File <span className="text-red-500">*</span>
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    selectedFile
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-300 hover:border-emerald-500 hover:bg-gray-50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm,.flac"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {selectedFile ? (
                    <div className="flex items-center justify-center space-x-3">
                      <FileAudio className="w-8 h-8 text-emerald-600" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-sm text-gray-600">Click to select audio file</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Supports MP3, WAV, M4A, OGG, WEBM, FLAC (max 512MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter meeting title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter meeting description"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              {/* Upload Button */}
              <button
                onClick={handleUpload}
                disabled={!selectedFile || !title.trim() || !description.trim() || isSubmitting}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    <span>Upload & Create Meeting</span>
                  </>
                )}
              </button>
            </>
          ) : (
            // Record Tab Content
            <>
              {/* Recording Controls */}
              <div className="space-y-4">
                {recordingState === 'idle' && (
                  <button
                    onClick={startRecording}
                    className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Mic className="w-5 h-5" />
                    <span>Start Recording</span>
                  </button>
                )}

                {recordingState === 'recording' && (
                  <div className="space-y-4">
                    <button
                      onClick={stopRecording}
                      className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Square className="w-5 h-5" />
                      <span>Stop Recording ({formatTime(recordingDuration)})</span>
                    </button>
                  </div>
                )}

                {recordingState === 'processing' && (
                  <div className="flex items-center justify-center space-x-2 px-6 py-3 bg-gray-400 text-white rounded-lg">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </div>
                )}
              </div>

              {/* Waveform Visualization */}
              {(recordingState === 'recording' || recordingState === 'preview') && waveform.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <AudioWaveform
                    duration={recordingDuration}
                    currentTime={playbackTime}
                    onSeek={() => {}}
                    waveformData={waveform}
                  />
                </div>
              )}

              {/* Preview Controls */}
              {recordingState === 'preview' && recordedBlob && (
                <>
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
                        onClick={handleReRecord}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Re-record</span>
                      </button>
                    </div>
                    <audio
                      ref={audioRef}
                      src={audioUrlRef.current || ''}
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

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter meeting title"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter meeting description"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  {/* Create Button */}
                  <button
                    onClick={handleCreateFromRecording}
                    disabled={!title.trim() || !description.trim() || isSubmitting}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        <span>Create Meeting</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

