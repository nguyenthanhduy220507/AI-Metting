import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { speakersService } from '../../services/speakers.service';
import { Speaker } from '../../types/Speaker.type';

interface EditSpeakerModalProps {
  isOpen: boolean;
  speaker: Speaker | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditSpeakerModal: React.FC<EditSpeakerModalProps> = ({
  isOpen,
  speaker,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (speaker) {
      setName(speaker.name);
    }
  }, [speaker]);

  const handleClose = () => {
    if (isSubmitting) return;
    setName('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!speaker) return;

    const newName = name.trim();
    if (!newName) {
      toast.error('Speaker name is required');
      return;
    }

    if (newName === speaker.name) {
      toast.info('Name unchanged');
      handleClose();
      return;
    }

    setIsSubmitting(true);
    try {
      await speakersService.update(speaker.id, newName);
      toast.success('Speaker updated successfully', {
        description: `Renamed "${speaker.name}" to "${newName}"`,
      });
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error('Failed to update speaker', {
        description: error?.response?.data?.message || error.message || 'Failed to update speaker name',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !speaker) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Speaker Name</h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Current Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Name
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
              {speaker.name}
            </div>
          </div>

          {/* New Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter new speaker name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              autoFocus
              disabled={isSubmitting}
            />
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              <strong>Note:</strong> This will update the speaker name in both the database and the voice recognition system (PKL).
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || name.trim() === speaker.name || isSubmitting}
              className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

