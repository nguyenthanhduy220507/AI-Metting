import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting, MeetingStatus } from './entities/meeting.entity';
import { Upload } from './entities/upload.entity';
import { Utterance } from './entities/utterance.entity';
import {
  MeetingSegment,
  SegmentStatus,
} from './entities/meeting-segment.entity';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { StorageService } from '../storage/storage.service';
import { JobsService } from '../jobs/jobs.service';
import { MeetingCallbackDto } from './dto/callback.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, JobState } from 'bullmq';
import { AUDIO_PROCESSING_QUEUE } from '../queue/audio-processing.queue';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name);

  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    @InjectRepository(Upload)
    private readonly uploadRepository: Repository<Upload>,
    @InjectRepository(Utterance)
    private readonly utteranceRepository: Repository<Utterance>,
    @InjectRepository(MeetingSegment)
    private readonly segmentRepository: Repository<MeetingSegment>,
    private readonly storageService: StorageService,
    private readonly jobsService: JobsService,
    @InjectQueue(AUDIO_PROCESSING_QUEUE)
    private readonly audioProcessingQueue: Queue,
  ) {}

  private readonly cleanupStates: Array<JobState | 'paused' | 'waiting-children'> = [
    'waiting',
    'delayed',
    'active',
    'failed',
    'paused',
    'waiting-children',
  ];

  async create(
    createMeetingDto: CreateMeetingDto,
    file: Express.Multer.File,
  ): Promise<Meeting> {
    if (!file) {
      throw new BadRequestException('Audio file is required');
    }

    const meeting = this.meetingRepository.create({
      ...createMeetingDto,
      status: MeetingStatus.PROCESSING,
    });
    await this.meetingRepository.save(meeting);

    const storedFile = await this.storageService.saveUploadedFile(
      file,
      meeting.id,
    );

    const upload = this.uploadRepository.create({
      meeting,
      originalFilename: file.originalname,
      storedFilename: storedFile.storedFilename,
      mimeType: file.mimetype,
      size: file.size,
      storagePath: storedFile.relativePath,
    });
    await this.uploadRepository.save(upload);

    // Dispatch processing job with error handling
    try {
      await this.jobsService.dispatchProcessingJob(
        meeting.id,
        storedFile.absolutePath,
      );
    } catch (error) {
      this.logger.error(
        `Failed to dispatch processing job for meeting ${meeting.id}: ${error}`,
      );
      // Mark meeting as failed if job dispatch fails
      meeting.status = MeetingStatus.FAILED;
      meeting.extra = {
        ...(meeting.extra ?? {}),
        failureReason: `Job dispatch failed: ${error instanceof Error ? error.message : String(error)}`,
      };
      await this.meetingRepository.save(meeting);
      throw error;
    }

    return meeting;
  }

  private async cleanupMeetingJobs(meetingId: string) {
    const jobs = await this.audioProcessingQueue.getJobs(this.cleanupStates);
    await Promise.all(
      jobs
        .filter((job) => {
          if (!job.id) return false;
          const jobId = String(job.id);
          return (
            jobId === `merge-${meetingId}` ||
            jobId.startsWith(`segment-${meetingId}-`)
          );
        })
        .map(async (job) => {
          try {
            await job.remove();
          } catch (error) {
            this.logger.warn(
              `[WARN] Unable to remove job ${job.id}: ${error instanceof Error ? error.message : error}`,
            );
          }
        }),
    );
  }

  findAll(): Promise<Meeting[]> {
    return this.meetingRepository.find({
      order: { createdAt: 'DESC' },
      relations: ['uploads'],
    });
  }

  async findOne(id: string): Promise<Meeting> {
    const meeting = await this.meetingRepository.findOne({
      where: { id },
      relations: ['uploads', 'utterances'],
    });
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }
    return meeting;
  }

  async update(id: string, updateMeetingDto: UpdateMeetingDto): Promise<Meeting> {
    const meeting = await this.findOne(id);
    
    if (updateMeetingDto.extra !== undefined) {
      meeting.extra = {
        ...(meeting.extra ?? {}),
        ...updateMeetingDto.extra,
      };
    }
    
    return this.meetingRepository.save(meeting);
  }

  async handleCallback(
    id: string,
    callbackDto: MeetingCallbackDto,
  ): Promise<Meeting> {
    if (callbackDto.status === MeetingStatus.FAILED) {
      await this.markFailed(id, callbackDto.extra?.['error'] as string);
      return this.findOne(id);
    }

    const meeting = await this.findOne(id);
    meeting.summary = callbackDto.summary;
    meeting.summaryPhases = callbackDto.summaryPhases;
    meeting.formattedLines = callbackDto.formattedLines;
    meeting.rawTranscript = callbackDto.raw_transcript;
    meeting.apiPayload = callbackDto.apiPayload;
    meeting.extra = callbackDto.extra;
    meeting.status = MeetingStatus.COMPLETED;

    await this.meetingRepository.save(meeting);

    if (callbackDto.raw_transcript?.length) {
      await this.utteranceRepository.delete({ meeting: { id: meeting.id } });
      const utterances = callbackDto.raw_transcript.map((entry) =>
        this.utteranceRepository.create({
          meeting,
          speaker: entry.speaker,
          text: entry.text,
          timestamp: entry.timestamp,
          start: entry.start,
          end: entry.end,
        }),
      );
      await this.utteranceRepository.save(utterances);
    }

    return meeting;
  }

  async markFailed(id: string, reason?: string) {
    const meeting = await this.findOne(id);
    meeting.status = MeetingStatus.FAILED;
    meeting.extra = {
      ...(meeting.extra ?? {}),
      failureReason: reason ?? 'Unknown',
    };
    await this.meetingRepository.save(meeting);
    return meeting;
  }

  async handleSegmentCallback(
    meetingId: string,
    segmentId: string,
    segmentResult: {
      transcript: Array<{
        speaker: string;
        text: string;
        start: number;
        end: number;
        timestamp?: string;
      }>;
      error?: string;
    },
  ): Promise<MeetingSegment> {
    this.logger.log(
      `[DEBUG] Received segment callback for meeting ${meetingId}, segment ${segmentId}`,
    );
    this.logger.log(
      `[DEBUG] Transcript entries: ${segmentResult.transcript?.length || 0}`,
    );

    const segment = await this.segmentRepository.findOne({
      where: { id: segmentId, meeting: { id: meetingId } },
      relations: ['meeting'],
    });

    if (!segment) {
      this.logger.error(
        `[ERROR] Segment ${segmentId} not found for meeting ${meetingId}`,
      );
      throw new NotFoundException(
        `Segment ${segmentId} not found for meeting ${meetingId}`,
      );
    }

    this.logger.log(
      `[DEBUG] Updating segment ${segment.segmentIndex} status to COMPLETED...`,
    );
    
    if (segmentResult.error) {
      this.logger.error(
        `[ERROR] Callback contains error: ${segmentResult.error}`,
      );
    }
    
    if (segmentResult.transcript && segmentResult.transcript.length > 0) {
      this.logger.log(
        `[DEBUG] First transcript entry: ${JSON.stringify(segmentResult.transcript[0])}`,
      );
    } else {
      this.logger.warn(
        `[WARN] Segment ${segment.segmentIndex} callback received empty transcript!`,
      );
      if (segmentResult.error) {
        this.logger.warn(
          `[WARN] Error from Python service: ${segmentResult.error}`,
        );
      }
    }

    segment.status = SegmentStatus.COMPLETED;
    segment.transcript = segmentResult.transcript || [];
    await this.segmentRepository.save(segment);
    
    // Verify transcript was saved
    const savedSegment = await this.segmentRepository.findOne({
      where: { id: segmentId },
    });
    this.logger.log(
      `[DEBUG] Segment ${segment.segmentIndex} saved with ${savedSegment?.transcript?.length || 0} transcript entries (verified)`,
    );

    // Update meeting progress
    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
      relations: ['segments'],
    });

    if (meeting) {
      const completed = meeting.segments.filter(
        (s) => s.status === SegmentStatus.COMPLETED,
      ).length;
      meeting.completedSegments = completed;
      this.logger.log(
        `[DEBUG] Meeting progress: ${completed}/${meeting.totalSegments} segments completed`,
      );

      // Check if all segments are completed, then trigger merge
      if (completed === meeting.totalSegments && meeting.totalSegments > 0) {
        this.logger.log(
          `[DEBUG] All segments completed! Triggering merge job...`,
        );
        // Remove existing merge job if it exists (might be in delayed/retry state)
        const existingJobId = `merge-${meetingId}`;
        try {
          const existingJob = await this.audioProcessingQueue.getJob(existingJobId);
          if (existingJob) {
            const state = await existingJob.getState();
            this.logger.log(
              `[DEBUG] Found existing merge job in state: ${state}`,
            );
            // If job is delayed, waiting, or failed, remove it and create new one
            if (['delayed', 'waiting', 'failed'].includes(state)) {
              await existingJob.remove();
              this.logger.log(
                `[DEBUG] Removed existing merge job in state: ${state}`,
              );
            } else if (state === 'active') {
              // Job is already being processed, don't create duplicate
              this.logger.log(`[DEBUG] Merge job already active, skipping`);
              await this.meetingRepository.save(meeting);
              return segment;
            } else if (state === 'completed') {
              // Job already completed, don't create duplicate
              this.logger.log(`[DEBUG] Merge job already completed, skipping`);
              await this.meetingRepository.save(meeting);
              return segment;
            }
          }
        } catch (error) {
          this.logger.warn(
            `[WARN] Could not check existing merge job: ${error}`,
          );
        }
        
        // Create new merge job (segments are ready, so process immediately)
        await this.audioProcessingQueue.add(
          'merge-segments',
          { meetingId },
          {
            jobId: existingJobId,
            attempts: 3, // Fewer attempts since segments are ready
            removeOnComplete: true,
            removeOnFail: false,
          },
        );
        this.logger.log(`[DEBUG] Merge job triggered for meeting ${meetingId}`);
      }

      await this.meetingRepository.save(meeting);
    }

        this.logger.log(
          `[SUCCESS] Segment callback processed for segment ${segment.segmentIndex}`,
        );
        return segment;
  }

  async retryMeeting(id: string): Promise<Meeting> {
    const meeting = await this.meetingRepository.findOne({
      where: { id },
      relations: ['uploads'],
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    if (!meeting.uploads || meeting.uploads.length === 0) {
      throw new BadRequestException(
        'Cannot retry because original audio file is missing',
      );
    }

    await this.cleanupMeetingJobs(id);
    await this.segmentRepository.delete({ meeting: { id } });
    await this.utteranceRepository.delete({ meeting: { id } });

    meeting.status = MeetingStatus.PROCESSING;
    meeting.summary = null;
    meeting.summaryPhases = null;
    meeting.formattedLines = null;
    meeting.rawTranscript = null;
    meeting.apiPayload = null;
    meeting.extra = {
      ...(meeting.extra ?? {}),
      retriedAt: new Date().toISOString(),
    };
    meeting.totalSegments = 0;
    meeting.completedSegments = 0;
    await this.meetingRepository.save(meeting);

    const audioPath = this.storageService.getAbsolutePath(
      meeting.uploads[0].storagePath,
    );
    await this.jobsService.dispatchProcessingJob(meeting.id, audioPath);
    return meeting;
  }

  async removeMeeting(id: string) {
    const meeting = await this.meetingRepository.findOne({
      where: { id },
      relations: ['uploads'],
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    await this.cleanupMeetingJobs(id);
    await this.segmentRepository.delete({ meeting: { id } });
    await this.utteranceRepository.delete({ meeting: { id } });

    if (meeting.uploads?.length) {
      await Promise.all(
        meeting.uploads.map(async (upload) => {
          if (!upload.storagePath) return;
          const absolutePath = this.storageService.getAbsolutePath(
            upload.storagePath,
          );
          try {
            await fs.unlink(absolutePath);
          } catch (error) {
            this.logger.warn(
              `[WARN] Failed to remove file ${absolutePath}: ${error instanceof Error ? error.message : error}`,
            );
          }
        }),
      );
    }

    try {
      const meetingDir = join(this.storageService.getUploadRoot(), id);
      await fs.rm(meetingDir, { recursive: true, force: true });
    } catch (error) {
      this.logger.warn(
        `[WARN] Failed to remove meeting directory: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }

    await this.meetingRepository.remove(meeting);
    return { id, deleted: true };
  }
}
