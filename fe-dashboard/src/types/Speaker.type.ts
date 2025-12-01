export enum SpeakerStatus {
  PENDING = 'PENDING',
  ENROLLING = 'ENROLLING',
  ACTIVE = 'ACTIVE',
  FAILED = 'FAILED',
}

export interface SpeakerSample {
  id: string;
  originalFilename: string;
  storedFilename: string;
  storagePath: string;
  mimeType: string;
  size: number;
}

export interface Speaker {
  id: string;
  name: string;
  status: SpeakerStatus;
  extra?: Record<string, unknown>;
  samples?: SpeakerSample[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSpeakerDto {
  name: string;
}

export interface SyncSpeakersResponse {
  created: number;
  updated: number;
  skipped: number;
  total: number;
}

