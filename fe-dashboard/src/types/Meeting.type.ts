export enum MeetingStatus {
  UPLOADED = 'UPLOADED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface Upload {
  id: string;
  originalFilename: string;
  storedFilename: string;
  mimeType: string;
  size: number;
  storagePath: string;
  durationSeconds?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Utterance {
  id: string;
  speaker: string;
  text: string;
  timestamp?: string;
  start?: number;
  end?: number;
}

export interface MeetingSegment {
  id: string;
  segmentIndex: number;
  status: string;
  transcript?: Array<{
    speaker: string;
    text: string;
    start: number;
    end: number;
    timestamp?: string;
  }>;
}

export interface Meeting {
  id: string;
  title?: string;
  description?: string;
  status: MeetingStatus;
  summary?: string | null;
  summaryPhases?: Array<{ title: string; points: string[] }> | null;
  formattedLines?: Array<{
    speaker: string;
    text: string;
    timestamp?: string;
  }> | null;
  rawTranscript?: Array<{
    speaker: string;
    text: string;
    start?: number;
    end?: number;
    timestamp?: string;
  }> | null;
  apiPayload?: Record<string, unknown> | null;
  extra?: Record<string, unknown> | null;
  uploads?: Upload[];
  utterances?: Utterance[];
  segments?: MeetingSegment[];
  totalSegments: number;
  completedSegments: number;
  createdAt: Date;
  updatedAt: Date;
}

