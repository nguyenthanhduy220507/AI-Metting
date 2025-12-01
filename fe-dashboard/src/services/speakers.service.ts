import { api } from './api';
import { Speaker, CreateSpeakerDto, SyncSpeakersResponse } from '../types/Speaker.type';

export const speakersService = {
  // Get all speakers
  getAll: async (): Promise<Speaker[]> => {
    const response = await api.get<Speaker[]>('/speakers');
    return response.data;
  },

  // Get speaker by ID
  getById: async (id: string): Promise<Speaker> => {
    const response = await api.get<Speaker>(`/speakers/${id}`);
    return response.data;
  },

  // Create speaker (upload samples)
  create: async (
    name: string,
    files: File[]
  ): Promise<Speaker> => {
    const formData = new FormData();
    formData.append('name', name);
    files.forEach((file) => {
      formData.append('samples', file);
    });

    const response = await api.post<Speaker>('/speakers', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 600000, // 10 minutes for file upload
    });
    return response.data;
  },

  // Delete speaker
  delete: async (id: string): Promise<void> => {
    await api.delete(`/speakers/${id}`);
  },

  // Sync speakers from PKL
  syncFromPkl: async (): Promise<SyncSpeakersResponse> => {
    const response = await api.post<SyncSpeakersResponse>('/speakers/sync-from-pkl');
    return response.data;
  },
};

