import React, { useState, useEffect } from 'react';
import {
  Plus,
  RefreshCw,
  Trash2,
  User,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { speakersService } from '../../../services/speakers.service';
import { Speaker, SpeakerStatus } from '../../../types/Speaker.type';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const AllSpeakers: React.FC = () => {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [syncing, setSyncing] = useState(false);
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

  const getStatusIcon = (status: SpeakerStatus) => {
    switch (status) {
      case SpeakerStatus.ACTIVE:
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case SpeakerStatus.FAILED:
        return <XCircle className="w-4 h-4 text-red-600" />;
      case SpeakerStatus.ENROLLING:
        return <Clock className="w-4 h-4 text-yellow-600 animate-spin" />;
      default:
        return <AlertCircle className="w-4 h-4 text-blue-600" />;
    }
  };

  const getStatusColor = (status: SpeakerStatus) => {
    switch (status) {
      case SpeakerStatus.ACTIVE:
        return 'bg-green-100 text-green-800';
      case SpeakerStatus.FAILED:
        return 'bg-red-100 text-red-800';
      case SpeakerStatus.ENROLLING:
        return 'bg-yellow-100 text-yellow-800';
      case SpeakerStatus.PENDING:
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredSpeakers = filterStatus === 'all'
    ? speakers
    : speakers.filter((s) => s.status === filterStatus);

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
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Filter:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value={SpeakerStatus.PENDING}>Pending</option>
                <option value={SpeakerStatus.ENROLLING}>Enrolling</option>
                <option value={SpeakerStatus.ACTIVE}>Active</option>
                <option value={SpeakerStatus.FAILED}>Failed</option>
              </select>
            </div>

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
                Status
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
            {filteredSpeakers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No speakers found
                </td>
              </tr>
            ) : (
              filteredSpeakers.map((speaker) => (
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(speaker.status)}
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          speaker.status
                        )}`}
                      >
                        {speaker.status}
                      </span>
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
    </div>
  );
};

export default AllSpeakers;

