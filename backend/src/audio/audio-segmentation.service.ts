import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { exec } from "child_process";
import { promisify } from "util";
import { promises as fs } from "fs";
import { join } from "path";
import { StorageService } from "../storage/storage.service";

const execAsync = promisify(exec);

export interface AudioSegment {
  index: number;
  startTime: number; // in seconds
  endTime: number; // in seconds
  filePath: string;
  absolutePath: string;
}

@Injectable()
export class AudioSegmentationService {
  private readonly logger = new Logger(AudioSegmentationService.name);
  private readonly segmentDuration: number;
  private readonly segmentOverlap: number;

  constructor(
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
  ) {
    this.segmentDuration = parseInt(
      this.configService.get<string>("AUDIO_SEGMENT_DURATION", "600"),
      10,
    );
    this.segmentOverlap = parseInt(
      this.configService.get<string>("AUDIO_SEGMENT_OVERLAP", "30"),
      10,
    );
  }

  async getAudioDuration(audioPath: string): Promise<number> {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`,
      );
      const duration = parseFloat(stdout.trim());
      if (isNaN(duration) || duration <= 0) {
        throw new Error(`Invalid audio duration: ${duration}`);
      }
      return duration;
    } catch (error) {
      this.logger.error(`Failed to get audio duration: ${error}`);
      throw new Error(`Failed to get audio duration: ${error}`);
    }
  }

  async segmentAudio(
    audioPath: string,
    meetingId: string,
  ): Promise<AudioSegment[]> {
    this.logger.log(`Starting audio segmentation for meeting ${meetingId}`);

    const duration = await this.getAudioDuration(audioPath);
    this.logger.log(
      `Audio duration: ${duration} seconds (${(duration / 60).toFixed(2)} minutes)`,
    );

    // Get worker concurrency from config
    const workerConcurrency = parseInt(
      this.configService.get<string>("WORKER_CONCURRENCY", "8"),
      10,
    );

    // Auto-calculate optimal segment size based on duration and workers
    const optimalSegmentDuration = this.calculateOptimalSegmentDuration(
      duration,
      workerConcurrency,
    );

    this.logger.log(
      `Optimal segment duration: ${optimalSegmentDuration} seconds (${(optimalSegmentDuration / 60).toFixed(2)} minutes)`,
    );

    const segments: AudioSegment[] = [];
    const segmentsDir = join(
      this.storageService.getUploadRoot(),
      meetingId,
      "segments",
    );
    await fs.mkdir(segmentsDir, { recursive: true });

    let currentStart = 0;
    let segmentIndex = 0;

    while (currentStart < duration) {
      const segmentEnd = Math.min(
        currentStart + optimalSegmentDuration,
        duration,
      );
      const segmentStart = Math.max(0, currentStart - this.segmentOverlap);

      const segmentFilename = `segment_${segmentIndex.toString().padStart(4, "0")}.wav`;
      const segmentPath = join(segmentsDir, segmentFilename);
      const relativePath = join(meetingId, "segments", segmentFilename);

      // Extract segment using FFmpeg
      await this.extractSegment(
        audioPath,
        segmentPath,
        segmentStart,
        segmentEnd - segmentStart,
      );

      segments.push({
        index: segmentIndex,
        startTime: currentStart,
        endTime: segmentEnd,
        filePath: relativePath,
        absolutePath: segmentPath,
      });

      this.logger.log(
        `Created segment ${segmentIndex}: ${segmentStart.toFixed(2)}s - ${segmentEnd.toFixed(2)}s`,
      );

      currentStart = segmentEnd;
      segmentIndex++;
    }

    const estimatedParallelTime = duration / 60 / workerConcurrency;
    this.logger.log(
      `Audio segmentation complete: ${segments.length} segments created (estimated parallel processing time: ${estimatedParallelTime.toFixed(2)} minutes)`,
    );
    return segments;
  }

  /**
   * Calculate optimal segment duration based on:
   * - Total video duration
   * - Number of available workers
   * - Target: Create enough segments to utilize all workers, but not too many small segments
   */
  private calculateOptimalSegmentDuration(
    totalDuration: number,
    workerConcurrency: number,
  ): number {
    // For very short files (< 10 minutes), use single segment
    const SHORT_FILE_THRESHOLD = 600; // 10 minutes

    if (totalDuration <= SHORT_FILE_THRESHOLD) {
      this.logger.log(
        `[DEBUG] File is short (${(totalDuration / 60).toFixed(2)} min), using single segment`,
      );
      return totalDuration;
    }

    // Minimum segment size: 2 minutes (120s) - too small segments are inefficient
    const MIN_SEGMENT_DURATION = 120;

    // Maximum segment size: 15 minutes (900s) - too large segments take too long
    const MAX_SEGMENT_DURATION = 900;

    // Ideal segment size: 5-10 minutes (300-600s)
    const IDEAL_MIN = 300;
    const IDEAL_MAX = 600;

    // Calculate how many segments we can create
    // For longer files, try to create at least as many segments as workers
    const idealSegmentCount = Math.max(
      workerConcurrency, // At least as many segments as workers
      Math.ceil(totalDuration / IDEAL_MAX), // Or based on ideal max duration
    );

    // Calculate segment duration to achieve ideal segment count
    let segmentDuration = totalDuration / idealSegmentCount;

    // Adjust based on constraints
    if (segmentDuration < MIN_SEGMENT_DURATION) {
      // If calculated duration is too small, use minimum
      // This means we'll have more segments than workers (OK, they'll queue)
      segmentDuration = MIN_SEGMENT_DURATION;
    } else if (segmentDuration > MAX_SEGMENT_DURATION) {
      // If calculated duration is too large, use maximum
      segmentDuration = MAX_SEGMENT_DURATION;
    } else if (segmentDuration < IDEAL_MIN) {
      // If between MIN and IDEAL_MIN, round up to IDEAL_MIN
      segmentDuration = IDEAL_MIN;
    } else if (segmentDuration > IDEAL_MAX) {
      // If between IDEAL_MAX and MAX, round down to IDEAL_MAX
      segmentDuration = IDEAL_MAX;
    }

    // Round to nearest 30 seconds for cleaner segments
    segmentDuration = Math.round(segmentDuration / 30) * 30;

    return segmentDuration;
  }

  private async extractSegment(
    inputPath: string,
    outputPath: string,
    startTime: number,
    duration: number,
  ): Promise<void> {
    // Use -ss before -i for faster seeking
    // Re-encode audio to ensure accurate segment extraction (don't use -acodec copy)
    // Use PCM format for WAV files to ensure compatibility
    const command = `ffmpeg -ss ${startTime} -t ${duration} -i "${inputPath}" -acodec pcm_s16le -ar 16000 -ac 1 -y "${outputPath}"`;
    try {
      await execAsync(command);
    } catch (error) {
      this.logger.error(`Failed to extract segment: ${error}`);
      throw new Error(`FFmpeg segment extraction failed: ${error}`);
    }
  }
}
