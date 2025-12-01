export type SpeakerSample = {
  id: string;
  originalFilename: string;
  storedFilename: string;
  storagePath: string;
  size: number;
  createdAt: string;
};

export type Speaker = {
  id: string;
  name: string;
  status: "PENDING" | "ENROLLING" | "ACTIVE" | "FAILED";
  samples: SpeakerSample[];
  createdAt: string;
  updatedAt: string;
};

