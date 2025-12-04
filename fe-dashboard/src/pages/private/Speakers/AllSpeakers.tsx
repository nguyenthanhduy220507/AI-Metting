import React, { useState, useEffect } from 'react';
import {
  Plus,
  RefreshCw,
  Trash2,
  User,
  Edit,
  Video,
  Eye,
} from 'lucide-react';
import { speakersService } from '../../../services/speakers.service';
import { Speaker } from '../../../types/Speaker.type';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { EditSpeakerModal, SpeakerDetectionsModal } from '../../../components';

const AllSpeakers: React.FC = () => {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetectionsModal, setShowDetectionsModal] = useState(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null);
  const navigate = useNavigate();

  const fetchSpeakers = async () => {
    try {
      setLoading(true);
      const data = await speakersService.getAll();
      setSpeakers(data);
    } catch (error: any) {
      console.error('Error fetching speakers:', error);
      toast.error('Failed to load speakers', {
        description: error?.response?.data?.message || error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpeakers();
  }, []);

  const handleEditClick = (speaker: Speaker) => {
    setSelectedSpeaker(speaker);
    setShowEditModal(true);
  };

  const handleViewDetections = (speaker: Speaker) => {
    setSelectedSpeaker(speaker);
    setShowDetectionsModal(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete speaker "${name}"?`)) {
      return;
    }

    try {
      toast.loading('Deleting speaker...', { id: 'delete' });
      await speakersService.delete(id);
      toast.success('Speaker deleted successfully', { id: 'delete' });
      fetchSpeakers();
    } catch (error: any) {
      toast.error('Failed to delete speaker', {
        id: 'delete',
        description: error?.response?.data?.message || error.message,
      });
    }
  };

  const handleSyncFromPkl = async () => {
    try {
      setSyncing(true);
      toast.loading('Syncing speakers from PKL...', { id: 'sync' });
      const result = await speakersService.syncFromPkl();
      toast.success('Sync completed', {
        id: 'sync',
        description: `Created: ${result.created}, Updated: ${result.updated}, Skipped: ${result.skipped}`,
      });
      fetchSpeakers();
    } catch (error: any) {
      toast.error('Failed to sync speakers', {
        id: 'sync',
        description: error?.response?.data?.message || error.message,
      });
    } finally {
      setSyncing(false);
    }
  };


  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">All Speakers</h1>
            <span className="text-sm text-gray-500">
              Manage speaker profiles and voice samples
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleSyncFromPkl}
              disabled={syncing}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              <span className="text-sm">Sync from PKL</span>
            </button>

            <button
              onClick={() => navigate('/speakers/create')}
              className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">Add Speaker</span>
            </button>

            <button
              onClick={fetchSpeakers}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="text-sm">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Detections
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Samples
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {speakers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No speakers found
                </td>
              </tr>
            ) : (
              speakers.map((speaker) => (
                <tr
                  key={speaker.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <User className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {speaker.name}
                        </div>
                        <div className="text-xs text-gray-500">{speaker.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-2">
                      <Video className="w-4 h-4 text-gray-400" />
                      <span>{speaker.detectionCount || 0}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {speaker.samples ? speaker.samples.length : 0} sample(s)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(speaker.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewDetections(speaker)}
                        className="p-1 hover:bg-emerald-100 rounded transition-colors text-emerald-600"
                        title="View detections"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditClick(speaker)}
                        className="p-1 hover:bg-blue-100 rounded transition-colors text-blue-600"
                        title="Edit name"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(speaker.id, speaker.name)}
                        className="p-1 hover:bg-red-100 rounded transition-colors text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Speaker Modal */}
      <EditSpeakerModal
        isOpen={showEditModal}
        speaker={selectedSpeaker}
        onClose={() => {
          setShowEditModal(false);
          setSelectedSpeaker(null);
        }}
        onSuccess={fetchSpeakers}
      />

      {/* Speaker Detections Modal */}
      <SpeakerDetectionsModal
        isOpen={showDetectionsModal}
        speakerId={selectedSpeaker?.id || null}
        speakerName={selectedSpeaker?.name || ''}
        onClose={() => {
          setShowDetectionsModal(false);
          setSelectedSpeaker(null);
        }}
      />
    </div>
  );
};

export default AllSpeakers;

