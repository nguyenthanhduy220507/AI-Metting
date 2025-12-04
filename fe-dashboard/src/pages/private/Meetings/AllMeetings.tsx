import React, { useState, useEffect, useMemo } from 'react';
import {
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  ArrowUp,
  ArrowDown,
  ChevronUp,
  ChevronDown,
  Plus,
} from 'lucide-react';
import { meetingsService } from '../../../services/meetings.service';
import { Meeting, MeetingStatus } from '../../../types/Meeting.type';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { CreateMeetingModal } from '../../../components';

type SortField = 'title' | 'description' | 'status' | 'createdAt' | null;
type SortDirection = 'asc' | 'desc';

const AllMeetings: React.FC = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [pageSize, setPageSize] = useState<number>(5);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const data = await meetingsService.getAll();
      setMeetings(data);
    } catch (error: any) {
      console.error('Error fetching meetings:', error);
      toast.error('Failed to load meetings', {
        description: error?.response?.data?.message || error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const handleDeleteClick = (id: string) => {
    setMeetingToDelete(id);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!meetingToDelete) return;

    try {
      setShowDeleteDialog(false);
      toast.loading('Deleting meeting...', { id: 'delete' });
      await meetingsService.delete(meetingToDelete);
      toast.success('Meeting deleted successfully', { id: 'delete' });
      setMeetingToDelete(null);
      fetchMeetings(); // Refresh the list
    } catch (error: any) {
      toast.error('Failed to delete meeting', {
        id: 'delete',
        description: error?.response?.data?.message || error.message,
      });
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setMeetingToDelete(null);
  };

  const handleDownloadAudio = async (id: string, title?: string) => {
    try {
      toast.loading('Downloading audio...', { id: 'download' });
      await meetingsService.downloadAudio(id, title ? `${title}.mp3` : undefined);
      toast.success('Audio downloaded successfully', { id: 'download' });
    } catch (error: any) {
      toast.error('Failed to download audio', {
        id: 'download',
        description: error?.response?.data?.message || error.message,
      });
    }
  };

  const getStatusColor = (status: MeetingStatus) => {
    switch (status) {
      case MeetingStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      case MeetingStatus.PROCESSING:
        return 'bg-yellow-100 text-yellow-800';
      case MeetingStatus.FAILED:
        return 'bg-red-100 text-red-800';
      case MeetingStatus.UPLOADED:
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredMeetings = useMemo(() => {
    let result = filterStatus === 'all'
      ? [...meetings]
      : meetings.filter((m) => m.status === filterStatus);

    // Apply sorting
    if (sortField) {
      result.sort((a, b) => {
        let comparison = 0;
        
        switch (sortField) {
          case 'title':
            const titleA = (a.title || 'Untitled Meeting').toLowerCase();
            const titleB = (b.title || 'Untitled Meeting').toLowerCase();
            comparison = titleA.localeCompare(titleB);
            break;
          case 'description':
            const descA = (a.description || '').toLowerCase();
            const descB = (b.description || '').toLowerCase();
            comparison = descA.localeCompare(descB);
            break;
          case 'status':
            const statusOrder = [
              MeetingStatus.UPLOADED,
              MeetingStatus.PROCESSING,
              MeetingStatus.COMPLETED,
              MeetingStatus.FAILED,
            ];
            comparison = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
            break;
          case 'createdAt':
            comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            break;
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [meetings, filterStatus, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const totalPages = Math.ceil(filteredMeetings.length / pageSize);
  const paginatedMeetings = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredMeetings.slice(startIndex, endIndex);
  }, [filteredMeetings, currentPage, pageSize]);

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, filteredMeetings.length);

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
            <h1 className="text-xl font-semibold text-gray-900">All Meetings</h1>
            <span className="text-sm text-gray-500">
              Manage and track all meeting recordings
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
                <option value={MeetingStatus.UPLOADED}>Uploaded</option>
                <option value={MeetingStatus.PROCESSING}>Processing</option>
                <option value={MeetingStatus.COMPLETED}>Completed</option>
                <option value={MeetingStatus.FAILED}>Failed</option>
              </select>
            </div>

            <button
              onClick={fetchMeetings}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="text-sm">Refresh</span>
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">Create Meeting</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('title')}
              >
                <div className="flex items-center space-x-1">
                  <span>Title</span>
                  {sortField === 'title' ? (
                    sortDirection === 'asc' ? (
                      <ArrowUp className="w-3 h-3" />
                    ) : (
                      <ArrowDown className="w-3 h-3" />
                    )
                  ) : (
                    <div className="w-3 h-3 flex flex-col">
                      <ChevronUp className="w-2 h-2 text-gray-400" />
                      <ChevronDown className="w-2 h-2 text-gray-400 -mt-1" />
                    </div>
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('description')}
              >
                <div className="flex items-center space-x-1">
                  <span>Description</span>
                  {sortField === 'description' ? (
                    sortDirection === 'asc' ? (
                      <ArrowUp className="w-3 h-3" />
                    ) : (
                      <ArrowDown className="w-3 h-3" />
                    )
                  ) : (
                    <div className="w-3 h-3 flex flex-col">
                      <ChevronUp className="w-2 h-2 text-gray-400" />
                      <ChevronDown className="w-2 h-2 text-gray-400 -mt-1" />
                    </div>
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center space-x-1">
                  <span>Status</span>
                  {sortField === 'status' ? (
                    sortDirection === 'asc' ? (
                      <ArrowUp className="w-3 h-3" />
                    ) : (
                      <ArrowDown className="w-3 h-3" />
                    )
                  ) : (
                    <div className="w-3 h-3 flex flex-col">
                      <ChevronUp className="w-2 h-2 text-gray-400" />
                      <ChevronDown className="w-2 h-2 text-gray-400 -mt-1" />
                    </div>
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('createdAt')}
              >
                <div className="flex items-center space-x-1">
                  <span>Created Date</span>
                  {sortField === 'createdAt' ? (
                    sortDirection === 'asc' ? (
                      <ArrowUp className="w-3 h-3" />
                    ) : (
                      <ArrowDown className="w-3 h-3" />
                    )
                  ) : (
                    <div className="w-3 h-3 flex flex-col">
                      <ChevronUp className="w-2 h-2 text-gray-400" />
                      <ChevronDown className="w-2 h-2 text-gray-400 -mt-1" />
                    </div>
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedMeetings.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No meetings found
                </td>
              </tr>
            ) : (
              paginatedMeetings.map((meeting) => (
                <tr
                  key={meeting.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/meetings/${meeting.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {meeting.title || 'Untitled Meeting'}
                    </div>
                    <div className="text-xs text-gray-500">{meeting.id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate" title={meeting.description || ''}>
                      {meeting.description || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        meeting.status
                      )}`}
                    >
                      {meeting.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(meeting.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div
                      className="flex items-center space-x-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => navigate(`/meetings/${meeting.id}`)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {meeting.status === MeetingStatus.COMPLETED && meeting.uploads && meeting.uploads.length > 0 && (
                        <button
                          onClick={() => handleDownloadAudio(meeting.id, meeting.title)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title="Download audio"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(meeting.id);
                        }}
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

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-700">
              Showing {startIndex} to {endIndex} of {filteredMeetings.length} entries
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 border rounded-md text-sm ${
                      pageNum === currentPage
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete Meeting"
        message="Are you sure you want to delete this meeting? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        variant="danger"
      />

      {/* Create Meeting Modal */}
      <CreateMeetingModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          fetchMeetings();
        }}
      />
    </div>
  );
};

export default AllMeetings;

