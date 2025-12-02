import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, X, RefreshCw, Mic } from 'lucide-react';
import { speakersService } from '../../../services/speakers.service';
import { toast } from 'sonner';
import { LiveRecorder } from '../../../components/common/LiveRecorder';

type InputMethod = 'upload' | 'recording';

const CreateSpeaker: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [inputMethod, setInputMethod] = useState<InputMethod>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [recordedSamples, setRecordedSamples] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter a speaker name');
      return;
    }

    const allFiles = [...files, ...recordedSamples];
    if (allFiles.length === 0) {
      toast.error('Please upload or record at least one audio sample');
      return;
    }

    try {
      setUploading(true);
      toast.loading('Creating speaker and uploading samples...', { id: 'create' });
      await speakersService.create(name.trim(), allFiles);
      toast.success('Speaker created successfully', { id: 'create' });
      navigate('/speakers');
    } catch (error: any) {
      toast.error('Failed to create speaker', {
        id: 'create',
        description: error?.response?.data?.message || error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/speakers')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Create New Speaker</h1>
              <p className="text-sm text-gray-500 mt-1">
                Upload audio samples or record directly to enroll a new speaker
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Speaker Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Speaker Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              placeholder="Enter speaker name"
              required
              disabled={uploading}
            />
            <p className="text-xs text-gray-500 mt-1">
              This name will be used to identify the speaker in transcripts
            </p>
          </div>

          {/* Input Method Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Audio Samples <span className="text-red-500">*</span>
            </label>
            <div className="flex space-x-2 mb-4">
              <button
                type="button"
                onClick={() => setInputMethod('upload')}
                className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                  inputMethod === 'upload'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
                disabled={uploading}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Upload className="w-4 h-4" />
                  <span>Upload Audio Samples</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setInputMethod('recording')}
                className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                  inputMethod === 'recording'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
                disabled={uploading}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Mic className="w-4 h-4" />
                  <span>Live Recording</span>
                </div>
              </button>
            </div>

            {/* Upload Audio Samples Tab */}
            {inputMethod === 'upload' && (
              <div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    id="file-upload"
                    accept="audio/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center space-y-2"
                  >
                    <Upload className="w-8 h-8 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Click to upload or drag and drop
                    </span>
                    <span className="text-xs text-gray-500">
                      Supported formats: WAV, MP3, FLAC, OGG, WEBM
                    </span>
                  </label>
                </div>

                {/* File List */}
                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-gray-700">
                      Selected Files ({files.length})
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {files.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(file.size)} • {file.type || 'Unknown type'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="ml-4 p-1 hover:bg-red-100 rounded text-red-600 transition-colors"
                            disabled={uploading}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Live Recording Tab */}
            {inputMethod === 'recording' && (
              <div>
                <LiveRecorder
                  onSamplesRecorded={setRecordedSamples}
                  maxSamples={5}
                  minSamples={2}
                />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> {inputMethod === 'upload' 
                ? 'Upload at least one audio sample containing clear speech from the speaker. Multiple samples will improve recognition accuracy.'
                : 'Record at least 2-5 audio samples by reading the provided scripts. Multiple samples will improve recognition accuracy.'}
            </p>
          </div>

          {/* Combined Samples Summary */}
          {(files.length > 0 || recordedSamples.length > 0) && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Total Samples: {files.length + recordedSamples.length}
              </p>
              {files.length > 0 && (
                <p className="text-xs text-gray-600">• {files.length} uploaded file(s)</p>
              )}
              {recordedSamples.length > 0 && (
                <p className="text-xs text-gray-600">• {recordedSamples.length} recorded sample(s)</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/speakers')}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              disabled={uploading || !name.trim() || (files.length === 0 && recordedSamples.length === 0)}
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Speaker</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSpeaker;


