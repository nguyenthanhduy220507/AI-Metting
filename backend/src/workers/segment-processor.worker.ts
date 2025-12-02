import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MeetingSegment,
  SegmentStatus,
} from '../meetings/entities/meeting-segment.entity';
import { Meeting } from '../meetings/entities/meeting.entity';
import { AUDIO_PROCESSING_QUEUE } from '../queue/audio-processing.queue';

export interface SegmentProcessingJobData {
  meetingId: string;
  segmentId: string;
  segmentPath: string;
  segmentIndex: number;
  segmentStartTime: number;
  segmentEndTime: number;
}

@Processor(AUDIO_PROCESSING_QUEUE, {
  concurrency: parseInt(process.env.WORKER_CONCURRENCY || '8', 10),
})
@Injectable()
export class SegmentProcessorWorker extends WorkerHost {
  private readonly logger = new Logger(SegmentProcessorWorker.name);

  constructor(
    @InjectRepository(MeetingSegment)
    private readonly segmentRepository: Repository<MeetingSegment>,
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    private readonly configService: ConfigService,
  ) {
    super();
    this.pythonServiceUrl =
      this.configService.get<string>('PYTHON_SERVICE_URL') ||
      'http://localhost:5000';
    this.callbackBaseUrl =
      this.configService.get<string>('BACKEND_CALLBACK_BASE_URL') ||
      'http://localhost:3333';
    this.logger.log(
      `[INIT] SegmentProcessorWorker initialized with concurrency: ${parseInt(process.env.WORKER_CONCURRENCY || '8', 10)}`,
    );
    this.logger.log(`[INIT] Python service URL: ${this.pythonServiceUrl}`);
    this.logger.log(`[INIT] Callback base URL: ${this.callbackBaseUrl}`);
  }
  private readonly pythonServiceUrl: string;
  private readonly callbackBaseUrl: string;

  /**
   * Wait for Python service to be ready with exponential backoff
   */
  private async waitForPythonService(maxRetries = 3): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await axios.get(`${this.pythonServiceUrl}/health`, {
          timeout: 5000,
        });
        if (response.status === 200) {
          return true;
        }
      } catch (error) {
        const waitTime = Math.min(1000 * Math.pow(2, i), 5000);
        this.logger.warn(
          `[WARN] Python service not ready (attempt ${i + 1}/${maxRetries}). Waiting ${waitTime}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
    return false;
  }

  async process(job: Job<SegmentProcessingJobData>): Promise<void> {
    // Only process 'process-segment' jobs
    if (job.name !== 'process-segment') {
      this.logger.log(
        `[DEBUG] Skipping job ${job.id} - not a process-segment job (name: ${job.name})`,
      );
      return;
    }

    // Log raw job data first
    this.logger.log(`[DEBUG] Raw job data: ${JSON.stringify(job.data, null, 2)}`);
    this.logger.log(`[DEBUG] Job ID: ${job.id}`);
    this.logger.log(`[DEBUG] Job name: ${job.name}`);

    // Validate job data before destructuring
    if (!job.data) {
      throw new Error('Job data is missing');
    }

    const {
      meetingId,
      segmentId,
      segmentPath,
      segmentIndex,
      segmentStartTime,
    } = job.data;

    // Validate all required fields
    if (!meetingId) {
      throw new Error('Job data missing meetingId');
    }
    if (!segmentId) {
      throw new Error('Job data missing segmentId');
    }
    if (!segmentPath) {
      throw new Error('Job data missing segmentPath');
    }
    if (segmentIndex === undefined || segmentIndex === null) {
      throw new Error('Job data missing segmentIndex');
    }
    if (segmentStartTime === undefined || segmentStartTime === null) {
      throw new Error('Job data missing segmentStartTime');
    }

    this.logger.log(
      `[DEBUG] Processing segment ${segmentIndex} for meeting ${meetingId}`,
    );
    this.logger.log(`[DEBUG] Segment path: ${segmentPath}`);
    this.logger.log(`[DEBUG] Segment ID: ${segmentId}`);

    const segment = await this.segmentRepository.findOne({
      where: { id: segmentId },
      relations: ['meeting'],
    });

    if (!segment) {
      this.logger.error(`[ERROR] Segment ${segmentId} not found`);
      throw new Error(`Segment ${segmentId} not found`);
    }

    try {
      this.logger.log(
        `[DEBUG] Updating segment ${segmentIndex} status to PROCESSING...`,
      );
      segment.status = SegmentStatus.PROCESSING;
      await this.segmentRepository.save(segment);

      // CRITICAL FIX: Wait for Python service to be ready
      this.logger.log(`[DEBUG] Checking Python service readiness...`);
      const isReady = await this.waitForPythonService();
      if (!isReady) {
        throw new Error('Python service is not ready');
      }

      // Call Python service to process segment
      // Ensure callbackBaseUrl doesn't have trailing slash
      const cleanCallbackBaseUrl = this.callbackBaseUrl.replace(/\/$/, '');
      const callbackUrl = `${cleanCallbackBaseUrl}/meetings/${meetingId}/segments/${segmentId}/callback`;
      
      // FIX: Normalize path - convert Windows backslashes to forward slashes
      // This prevents double-escaping issues when sending via HTTP JSON
      const normalizedSegmentPath = segmentPath.replace(/\\/g, '/');
      
      this.logger.log(
        `[DEBUG] Calling Python service: ${this.pythonServiceUrl}/process-segment`,
      );
      this.logger.log(`[DEBUG] Normalized segment path: ${normalizedSegmentPath}`);
      this.logger.log(`[DEBUG] Callback URL: ${callbackUrl}`);

      const requestBody = {
        segment_path: normalizedSegmentPath,
        segment_start_time: segmentStartTime,
        meeting_id: meetingId,
        segment_index: segmentIndex,
        callback_url: callbackUrl,
        language: 'vi', // Default language
      };

      const response = await axios.post(
        `${this.pythonServiceUrl}/process-segment`,
        requestBody,
        { timeout: 600000 }, // 10 minutes timeout
      );

      const responseData = response.data as { status?: string };
      this.logger.log(
        `[SUCCESS] Segment ${segmentIndex} processing started: ${responseData.status || 'queued'}`,
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(
          `[ERROR] Failed to process segment ${segmentIndex}: ${error.response?.status} ${error.response?.statusText}`,
        );
        this.logger.error(
          `[ERROR] Error message: ${error.message}`,
        );
        this.logger.error(
          `[ERROR] Response data: ${JSON.stringify(error.response?.data)}`,
        );
        this.logger.error(
          `[ERROR] Request URL: ${error.config?.url}`,
        );
      } else {
        this.logger.error(`[ERROR] Failed to process segment ${segmentIndex}: ${error}`);
      }
      
      segment.status = SegmentStatus.FAILED;
      segment.error = error instanceof Error ? error.message : String(error);
      await this.segmentRepository.save(segment);

      // Update meeting progress
      await this.updateMeetingProgress(meetingId);

      throw error;
    }
  }

  private async updateMeetingProgress(meetingId: string): Promise<void> {
    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
      relations: ['segments'],
    });

    if (!meeting) return;

    const completed = meeting.segments.filter(
      (s) => s.status === SegmentStatus.COMPLETED,
    ).length;
    meeting.completedSegments = completed;
    await this.meetingRepository.save(meeting);
  }
}
