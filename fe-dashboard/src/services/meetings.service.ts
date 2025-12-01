import { api } from './api';
import { Meeting, MeetingStatus } from '../types/Meeting.type';

export const meetingsService = {
  // Get all meetings
  getAll: async (): Promise<Meeting[]> => {
    const response = await api.get<Meeting[]>('/meetings');
    return response.data;
  },

  // Get meeting by ID
  getById: async (id: string): Promise<Meeting> => {
    const response = await api.get<Meeting>(`/meetings/${id}`);
    return response.data;
  },

  // Get meeting status
  getStatus: async (id: string): Promise<{ id: string; status: MeetingStatus; updatedAt: Date }> => {
    const response = await api.get<{ id: string; status: MeetingStatus; updatedAt: Date }>(
      `/meetings/${id}/status`
    );
    return response.data;
  },

  // Create meeting (upload file)
  create: async (
    file: File,
    title?: string,
    description?: string
  ): Promise<Meeting> => {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    if (description) formData.append('description', description);

    const response = await api.post<Meeting>('/meetings', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000, // 5 minutes for file upload
    });
    return response.data;
  },

  // Get audio file
  getAudio: async (id: string): Promise<Blob> => {
    const response = await api.get(`/meetings/${id}/audio`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Download audio file
  downloadAudio: async (id: string, filename?: string): Promise<void> => {
    const blob = await meetingsService.getAudio(id);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `meeting-${id}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // Delete meeting
  delete: async (id: string): Promise<void> => {
    await api.delete(`/meetings/${id}`);
  },

  // Update meeting
  update: async (id: string, data: { extra?: Record<string, unknown> }): Promise<Meeting> => {
    const response = await api.patch<Meeting>(`/meetings/${id}`, data);
    return response.data;
  },
};

