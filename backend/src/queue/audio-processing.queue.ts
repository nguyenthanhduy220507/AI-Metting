import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';

export const AUDIO_PROCESSING_QUEUE = 'audio-processing';

export const createAudioProcessingQueue = (configService: ConfigService) => {
  return new Queue(AUDIO_PROCESSING_QUEUE, {
    connection: {
      host: configService.get<string>('REDIS_HOST', 'localhost'),
      port: parseInt(configService.get<string>('REDIS_PORT', '6379'), 10),
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        age: 24 * 3600, // Keep completed jobs for 24 hours
        count: 1000,
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      },
    },
  });
};
