import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AUDIO_PROCESSING_QUEUE } from '../queue/audio-processing.queue';
import { AudioSegmentationService } from '../audio/audio-segmentation.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting } from '../meetings/entities/meeting.entity';
import {
  MeetingSegment,
  SegmentStatus,
} from '../meetings/entities/meeting-segment.entity';
import axios from 'axios';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectQueue(AUDIO_PROCESSING_QUEUE)
    private readonly audioProcessingQueue: Queue,
    private readonly audioSegmentationService: AudioSegmentationService,
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    @InjectRepository(MeetingSegment)
    private readonly segmentRepository: Repository<MeetingSegment>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Wait for Python service to be ready with exponential backoff
   */
  private async waitForPythonService(
    pythonServiceUrl: string,
    maxRetries = 5,
  ): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        this.logger.log(
          `[DEBUG] Checking Python service health (attempt ${i + 1}/${maxRetries})...`,
        );
        const response = await axios.get(`${pythonServiceUrl}/health`, {
          timeout: 5000,
        });
        if (response.status === 200) {
          this.logger.log(
            `[SUCCESS] Python service is healthy: ${JSON.stringify(response.data)}`,
          );
          return true;
        }
      } catch (error) {
        const waitTime = Math.min(1000 * Math.pow(2, i), 10000); // Max 10s
        this.logger.warn(
          `[WARN] Python service not ready yet (attempt ${i + 1}/${maxRetries}). Retrying in ${waitTime}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
    return false;
  }

  async dispatchProcessingJob(meetingId: string, audioPath: string) {
    this.logger.log(`[DEBUG] Starting processing job for meeting ${meetingId}`);
    this.logger.log(`[DEBUG] Audio path: ${audioPath}`);

    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
    });

    if (!meeting) {
      this.logger.error(`[ERROR] Meeting ${meetingId} not found`);
      throw new Error(`Meeting ${meetingId} not found`);
    }

    try {
      // Check audio duration to decide whether to use segmentation
      this.logger.log(`[DEBUG] Checking audio duration...`);
      const duration = await this.audioSegmentationService.getAudioDuration(
        audioPath,
      );
      const durationMinutes = duration / 60;
      const SHORT_FILE_THRESHOLD = 600; // 10 minutes in seconds

      this.logger.log(
        `[DEBUG] Audio duration: ${duration} seconds (${durationMinutes.toFixed(2)} minutes)`,
      );

      // For short files (< 10 minutes), skip segmentation and call /process directly
      if (duration <= SHORT_FILE_THRESHOLD) {
        this.logger.log(
          `[DEBUG] File is short (${durationMinutes.toFixed(2)} min), skipping segmentation and calling /process directly`,
        );

        const pythonServiceUrl =
          this.configService.get<string>('PYTHON_SERVICE_URL') ||
          'http://localhost:5000';
        const callbackBaseUrl =
          this.configService.get<string>('BACKEND_CALLBACK_BASE_URL') ||
          'http://localhost:3333';
        const cleanCallbackBaseUrl = callbackBaseUrl.replace(/\/$/, '');
        const callbackUrl = `${cleanCallbackBaseUrl}/meetings/${meetingId}/callback`;

        // FIX: Normalize path - convert Windows backslashes to forward slashes
        // This prevents double-escaping issues when sending via HTTP JSON
        const normalizedAudioPath = audioPath.replace(/\\/g, '/');

        this.logger.log(
          `[DEBUG] Original path: ${audioPath}`,
        );
        this.logger.log(`[DEBUG] Normalized path: ${normalizedAudioPath}`);

        // CRITICAL FIX: Wait for Python service to be ready before sending request
        this.logger.log(`[DEBUG] Waiting for Python service to be ready...`);
        const isReady = await this.waitForPythonService(pythonServiceUrl);
        if (!isReady) {
          const error = new Error(
            'Python service is not ready after multiple retries',
          );
          this.logger.error(`[ERROR] ${error.message}`);
          throw error;
        }

        this.logger.log(
          `[DEBUG] Calling Python service /process endpoint`,
        );
        this.logger.log(`[DEBUG] Callback URL: ${callbackUrl}`);

        try {
          const response = await axios.post(
            `${pythonServiceUrl}/process`,
            {
              meetingId,
              audio_path: normalizedAudioPath,
              callback_url: callbackUrl,
              language: 'vi',
            },
            { timeout: 60000 }, // 1 minute timeout for initial request
          );

          this.logger.log(
            `[SUCCESS] Direct processing job queued: ${response.data.status}`,
          );
          return;
        } catch (error) {
          this.logger.error(
            `[ERROR] Failed to call Python service /process: ${error}`,
          );
          throw error;
        }
      }

      // For longer files, use segmentation
      this.logger.log(
        `[DEBUG] File is long (${durationMinutes.toFixed(2)} min), using segmentation`,
      );

      // Step 1: Segment the audio
      this.logger.log(`[DEBUG] Step 1: Starting audio segmentation...`);
      const segments = await this.audioSegmentationService.segmentAudio(
        audioPath,
        meetingId,
      );

      // Validate segmentation results
      if (!segments || segments.length === 0) {
        this.logger.error(`[ERROR] No segments created from audio file`);
        throw new Error('No segments created from audio file');
      }

      this.logger.log(
        `[DEBUG] Audio segmented into ${segments.length} segments for meeting ${meetingId}`,
      );
      segments.forEach((seg, idx) => {
        this.logger.log(
          `[DEBUG] Segment ${idx}: ${seg.startTime}s - ${seg.endTime}s (${seg.filePath})`,
        );
      });

      // Step 2: Create segment entities and jobs
      this.logger.log(
        `[DEBUG] Step 2: Creating ${segments.length} segment entities and jobs...`,
      );
      const segmentEntities: MeetingSegment[] = [];
      for (const segment of segments) {
        this.logger.log(
          `[DEBUG] Creating segment entity for segment ${segment.index}...`,
        );

        // Validate segment data before creating entity
        if (segment.index === undefined || segment.index === null) {
          throw new Error(`Segment missing index`);
        }
        if (!segment.absolutePath) {
          throw new Error(`Segment ${segment.index} missing absolutePath`);
        }
        if (segment.startTime === undefined || segment.endTime === undefined) {
          throw new Error(
            `Segment ${segment.index} missing startTime or endTime`,
          );
        }

        const segmentEntity = this.segmentRepository.create({
          meeting,
          segmentIndex: segment.index,
          startTime: segment.startTime,
          endTime: segment.endTime,
          filePath: segment.filePath,
          status: SegmentStatus.PENDING,
        });
        await this.segmentRepository.save(segmentEntity);
        segmentEntities.push(segmentEntity);
        this.logger.log(`[DEBUG] Segment entity ${segmentEntity.id} created`);

        // Validate all job data fields before creating job
        const jobData = {
          meetingId,
          segmentId: segmentEntity.id,
          segmentPath: segment.absolutePath,
          segmentIndex: segment.index,
          segmentStartTime: segment.startTime,
          segmentEndTime: segment.endTime,
        };

        // Validate job data
        if (!jobData.segmentId) {
          throw new Error(`Segment ${segment.index} entity missing ID`);
        }
        if (!jobData.segmentPath) {
          throw new Error(`Segment ${segment.index} missing segmentPath`);
        }
        if (jobData.segmentIndex === undefined || jobData.segmentIndex === null) {
          throw new Error(`Segment missing segmentIndex`);
        }
        if (
          jobData.segmentStartTime === undefined ||
          jobData.segmentEndTime === undefined
        ) {
          throw new Error(
            `Segment ${segment.index} missing segmentStartTime or segmentEndTime`,
          );
        }

        // Log job data for debugging
        this.logger.log(
          `[DEBUG] Job data for segment ${segment.index}: ${JSON.stringify(jobData, null, 2)}`,
        );

        // Add segment processing job to queue
        this.logger.log(
          `[DEBUG] Adding segment ${segment.index} job to queue...`,
        );
        const job = await this.audioProcessingQueue.add(
          'process-segment',
          jobData,
          {
            jobId: `segment-${meetingId}-${segment.index}`,
          },
        );
        this.logger.log(
          `[DEBUG] Segment ${segment.index} job added with ID: ${job.id}, name: ${job.name || 'process-segment'}`,
        );
        
        // TEMP DEBUG: Check queue status and job details
        const waitingCount = await this.audioProcessingQueue.getWaitingCount();
        const activeCount = await this.audioProcessingQueue.getActiveCount();
        const delayedCount = await this.audioProcessingQueue.getDelayedCount();
        const failedCount = await this.audioProcessingQueue.getFailedCount();
        this.logger.log(
          `[DEBUG] Queue status after adding job - Waiting: ${waitingCount}, Active: ${activeCount}, Delayed: ${delayedCount}, Failed: ${failedCount}`,
        );
      }

      // Update meeting with segment count
      this.logger.log(
        `[DEBUG] Updating meeting with segment count: ${segments.length}`,
      );
      meeting.totalSegments = segments.length;
      meeting.completedSegments = 0;
      await this.meetingRepository.save(meeting);
      this.logger.log(
        `[DEBUG] Meeting updated: totalSegments=${meeting.totalSegments}, completedSegments=${meeting.completedSegments}`,
      );

      // Step 3: Add merge job (will be processed after all segments complete)
      // Merge job will retry if segments aren't ready yet
      this.logger.log(`[DEBUG] Step 3: Adding merge job to queue...`);
      const mergeJob = await this.audioProcessingQueue.add(
        'merge-segments',
        { meetingId },
        {
          jobId: `merge-${meetingId}`,
          attempts: 10, // More attempts since it needs to wait for segments
          backoff: {
            type: 'exponential',
            delay: 5000, // Start with 5 seconds, exponential backoff
          },
        },
      );
      this.logger.log(`[DEBUG] Merge job added with ID: ${mergeJob.id}`);

      this.logger.log(
        `[SUCCESS] Dispatched ${segments.length} segment jobs and 1 merge job for meeting ${meetingId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to dispatch processing job for meeting ${meetingId}: ${error}`,
      );
      throw error;
    }
  }
}
