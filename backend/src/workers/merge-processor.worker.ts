import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting } from '../meetings/entities/meeting.entity';
import {
  MeetingSegment,
  SegmentStatus,
} from '../meetings/entities/meeting-segment.entity';
import { MeetingStatus } from '../meetings/entities/meeting.entity';
import {
  AudioMergeService,
  SegmentTranscript,
} from '../audio/audio-merge.service';
import { MeetingsService } from '../meetings/meetings.service';
import { AUDIO_PROCESSING_QUEUE } from '../queue/audio-processing.queue';

export interface MergeJobData {
  meetingId: string;
}

@Processor(AUDIO_PROCESSING_QUEUE, {
  concurrency: 1, // Only one merge job at a time
})
@Injectable()
export class MergeProcessorWorker extends WorkerHost {
  private readonly logger = new Logger(MergeProcessorWorker.name);

  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    @InjectRepository(MeetingSegment)
    private readonly segmentRepository: Repository<MeetingSegment>,
    private readonly audioMergeService: AudioMergeService,
    private readonly meetingsService: MeetingsService,
  ) {
    super();
    this.logger.log('[INIT] MergeProcessorWorker initialized');
  }

  async process(job: Job<MergeJobData>): Promise<void> {
    // Only process 'merge-segments' jobs
    if (job.name !== 'merge-segments') {
      this.logger.log(
        `[DEBUG] Skipping job ${job.id} - not a merge-segments job (name: ${job.name})`,
      );
      return;
    }

    const { meetingId } = job.data;

    this.logger.log(`[DEBUG] Starting merge process for meeting ${meetingId}`);

    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
      relations: ['segments'],
    });

    if (!meeting) {
      this.logger.error(`[ERROR] Meeting ${meetingId} not found`);
      throw new Error(`Meeting ${meetingId} not found`);
    }

    this.logger.log(
      `[DEBUG] Meeting found: totalSegments=${meeting.totalSegments}, completedSegments=${meeting.completedSegments}`,
    );
    this.logger.log(`[DEBUG] Checking segment statuses...`);

    // Check if all segments are completed
    const allCompleted = meeting.segments.every(
      (s) => s.status === SegmentStatus.COMPLETED,
    );

    const statusCounts = {
      completed: meeting.segments.filter(
        (s) => s.status === SegmentStatus.COMPLETED,
      ).length,
      processing: meeting.segments.filter(
        (s) => s.status === SegmentStatus.PROCESSING,
      ).length,
      pending: meeting.segments.filter(
        (s) => s.status === SegmentStatus.PENDING,
      ).length,
      failed: meeting.segments.filter((s) => s.status === SegmentStatus.FAILED)
        .length,
    };
    this.logger.log(
      `[DEBUG] Segment statuses: ${JSON.stringify(statusCounts)}`,
    );

    if (!allCompleted) {
      const pending = meeting.segments.filter(
        (s) => s.status !== SegmentStatus.COMPLETED,
      );
      const failed = meeting.segments.filter(
        (s) => s.status === SegmentStatus.FAILED,
      );

      if (failed.length > 0) {
        this.logger.error(
          `[ERROR] Cannot merge: ${failed.length} segments failed`,
        );
        throw new Error(`Cannot merge: ${failed.length} segments failed`);
      }

      this.logger.warn(
        `[WARN] Not all segments completed. Pending: ${pending.length}, Processing: ${statusCounts.processing}. Retrying later...`,
      );
      // Retry after 10 seconds
      throw new Error(
        `Cannot merge: ${pending.length} segments still pending. Will retry.`,
      );
    }

    try {
      this.logger.log(`[DEBUG] All segments completed. Starting merge...`);

      // Prepare segment transcripts
      this.logger.log(
        `[DEBUG] Preparing ${meeting.segments.length} segment transcripts...`,
      );
      
      // Log each segment's transcript status
      meeting.segments.forEach((seg) => {
        this.logger.log(
          `[DEBUG] Segment ${seg.segmentIndex}: transcript length = ${seg.transcript?.length || 0}, status = ${seg.status}`,
        );
        if (seg.transcript && seg.transcript.length > 0) {
          this.logger.log(
            `[DEBUG] Segment ${seg.segmentIndex} first entry: ${JSON.stringify(seg.transcript[0])}`,
          );
        } else {
          this.logger.warn(
            `[WARN] Segment ${seg.segmentIndex} has empty or missing transcript!`,
          );
        }
      });

      const segmentTranscripts: SegmentTranscript[] = meeting.segments
        .sort((a, b) => a.segmentIndex - b.segmentIndex)
        .map((segment) => ({
          segmentIndex: segment.segmentIndex,
          startTime: segment.startTime,
          endTime: segment.endTime,
          transcript: segment.transcript || [],
        }));

      const totalTranscriptEntries = segmentTranscripts.reduce(
        (sum, seg) => sum + seg.transcript.length,
        0,
      );
      this.logger.log(
        `[DEBUG] Total transcript entries: ${totalTranscriptEntries}`,
      );

      // Validate that we have transcript data
      if (totalTranscriptEntries === 0) {
        this.logger.error(
          `[ERROR] No transcript entries found in any segment! Cannot generate summary.`,
        );
        throw new Error(
          'No transcript entries found. Cannot merge empty transcripts.',
        );
      }

      // Merge transcripts
      this.logger.log(`[DEBUG] Merging transcripts...`);
      const mergedTranscript =
        this.audioMergeService.mergeSegmentTranscripts(segmentTranscripts);
      this.logger.log(
        `[DEBUG] Merged transcript contains ${mergedTranscript.length} entries`,
      );

      // Generate summary
      this.logger.log(`[DEBUG] Generating summary...`);
      const { summary, formattedLines } =
        await this.audioMergeService.generateSummary(mergedTranscript);
      this.logger.log(
        `[DEBUG] Summary generated: ${summary.length} characters`,
      );

      // Update meeting with results
      this.logger.log(`[DEBUG] Updating meeting with results...`);
      meeting.status = MeetingStatus.COMPLETED;
      meeting.summary = summary;
      meeting.formattedLines = formattedLines;
      meeting.rawTranscript = mergedTranscript;
      await this.meetingRepository.save(meeting);

      this.logger.log(`[SUCCESS] Merge completed for meeting ${meetingId}`);
    } catch (error) {
      this.logger.error(`Failed to merge segments: ${error}`);
      meeting.status = MeetingStatus.FAILED;
      await this.meetingRepository.save(meeting);
      throw error;
    }
  }
}
