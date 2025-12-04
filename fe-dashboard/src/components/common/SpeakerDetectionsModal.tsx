import React, { useState, useEffect } from 'react';
import { X, Eye, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { speakersService, SpeakerDetectionsResponse } from '../../services/speakers.service';
import { useNavigate } from 'react-router-dom';

interface SpeakerDetectionsModalProps {
  isOpen: boolean;
  speakerId: string | null;
  speakerName: string;
  onClose: () => void;
}

export const SpeakerDetectionsModal: React.FC<SpeakerDetectionsModalProps> = ({
  isOpen,
  speakerId,
  speakerName,
  onClose,
}) => {
  const [data, setData] = useState<SpeakerDetectionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && speakerId) {
      fetchDetections();
    }
  }, [isOpen, speakerId]);

  const fetchDetections = async () => {
    if (!speakerId) return;

    setLoading(true);
    try {
      const response = await speakersService.getDetections(speakerId);
      setData(response);
    } catch (error: any) {
      console.error('Error fetching detections:', error);
      toast.error('Failed to load detections', {
        description: error?.response?.data?.message || error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleViewMeeting = (meetingId: string) => {
    navigate(`/meetings/${meetingId}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Speaker Detections - {speakerName}
            </h2>
            {data && (
              <p className="text-sm text-gray-500 mt-1">
                Found in {data.totalMeetings} meeting(s)
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : data && data.meetings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Meeting Title
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utterances
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.meetings.map((meeting) => (
                    <tr
                      key={meeting.meetingId}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {meeting.title}
                        </div>
                        <div className="text-xs text-gray-500">
                          {meeting.meetingId}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(meeting.createdAt)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{meeting.utteranceCount}</span>
                          <span className="text-gray-500">times</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => handleViewMeeting(meeting.meetingId)}
                          className="flex items-center space-x-1 text-emerald-600 hover:text-emerald-700 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Eye className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">
                No meetings found for this speaker
              </p>
              <p className="text-xs text-gray-400 mt-1">
                This speaker has not been detected in any completed meetings yet
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

