export type MeetingStatus = 'UPLOADED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type TimelineEntry = {
  speaker: string;
  text: string;
  timestamp?: string;
  start?: number;
  end?: number;
};

export type Meeting = {
  id: string;
  title?: string;
  description?: string;
  status: MeetingStatus;
  summary?: string;
  summaryPhases?: Array<{ title: string; points: string[] }>;
  formattedLines?: TimelineEntry[];
  rawTranscript?: TimelineEntry[];
  apiPayload?: Record<string, unknown>;
  uploads?: Array<{
    id: string;
    originalFilename: string;
    storedFilename: string;
    storagePath: string;
    mimeType: string;
    size: number;
  }>;
  createdAt: string;
  updatedAt: string;
};

