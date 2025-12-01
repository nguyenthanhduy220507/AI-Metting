import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface SegmentTranscript {
  segmentIndex: number;
  startTime: number;
  endTime: number;
  transcript: Array<{
    speaker: string;
    text: string;
    start: number;
    end: number;
    timestamp?: string;
  }>;
}

@Injectable()
export class AudioMergeService {
  private readonly logger = new Logger(AudioMergeService.name);
  private readonly pythonServiceUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.pythonServiceUrl =
      this.configService.get<string>('PYTHON_SERVICE_URL') ||
      'http://localhost:5000';
  }

  mergeSegmentTranscripts(segments: SegmentTranscript[]): Array<{
    speaker: string;
    text: string;
    start: number;
    end: number;
    timestamp: string;
  }> {
    this.logger.log(`Merging ${segments.length} segment transcripts`);
    
    // Validate segments have transcript data
    const segmentsWithTranscript = segments.filter(
      (seg) => seg.transcript && seg.transcript.length > 0,
    );
    
    if (segmentsWithTranscript.length === 0) {
      this.logger.error(
        `[ERROR] No segments with transcript data found! Cannot merge.`,
      );
      throw new Error('No transcript data found in any segment');
    }
    
    this.logger.log(
      `[DEBUG] ${segmentsWithTranscript.length} out of ${segments.length} segments have transcript data`,
    );

    // Log detailed information about each segment
    let totalEntries = 0;
    segments.forEach((seg, idx) => {
      const entryCount = seg.transcript?.length || 0;
      totalEntries += entryCount;
      this.logger.log(
        `[DEBUG] Segment ${seg.segmentIndex} (${idx + 1}/${segments.length}): ` +
        `${entryCount} entries, duration: ${(seg.endTime - seg.startTime).toFixed(2)}s ` +
        `(${seg.startTime.toFixed(2)}s - ${seg.endTime.toFixed(2)}s)`,
      );
      
      // Warning if segment has very few entries relative to its duration
      const segmentDuration = seg.endTime - seg.startTime;
      const entriesPerMinute = entryCount / (segmentDuration / 60);
      if (segmentDuration > 60 && entriesPerMinute < 1) {
        this.logger.warn(
          `[WARN] Segment ${seg.segmentIndex} has very few entries (${entryCount} entries for ${(segmentDuration / 60).toFixed(2)} minutes)`,
        );
      }
    });
    
    this.logger.log(
      `[DEBUG] Total transcript entries before merge: ${totalEntries}`,
    );

    const merged: Array<{
      speaker: string;
      text: string;
      start: number;
      end: number;
      timestamp: string;
    }> = [];

    // Normalize speaker labels across segments
    const speakerMapping = new Map<string, string>();
    let nextSpeakerId = 0;

    for (const segment of segments) {
      if (!segment.transcript || segment.transcript.length === 0) {
        this.logger.warn(
          `[WARN] Skipping segment ${segment.segmentIndex} - no transcript data`,
        );
        continue;
      }
      
      this.logger.log(
        `[DEBUG] Processing segment ${segment.segmentIndex} with ${segment.transcript.length} entries`,
      );
      
      for (const entry of segment.transcript) {
        // Adjust timestamps to absolute time
        const absoluteStart = segment.startTime + entry.start;
        const absoluteEnd = segment.startTime + entry.end;

        // Normalize speaker labels
        let normalizedSpeaker = speakerMapping.get(entry.speaker);
        if (!normalizedSpeaker) {
          normalizedSpeaker = `SPEAKER_${nextSpeakerId.toString().padStart(2, '0')}`;
          speakerMapping.set(entry.speaker, normalizedSpeaker);
          nextSpeakerId++;
        }

        merged.push({
          speaker: normalizedSpeaker,
          text: entry.text,
          start: absoluteStart,
          end: absoluteEnd,
          timestamp: this.formatTimestamp(absoluteStart),
        });
      }
    }

    // Sort by start time
    merged.sort((a, b) => a.start - b.start);

    // Validate merged result
    if (merged.length === 0) {
      this.logger.error(
        `[ERROR] Merged transcript is empty! This should not happen.`,
      );
      throw new Error('Merged transcript is empty');
    }

    // Warning if merged result has significantly fewer entries than expected
    if (merged.length < totalEntries * 0.8) {
      this.logger.warn(
        `[WARN] Merged transcript has fewer entries (${merged.length}) than expected (${totalEntries}). ` +
        `Possible data loss during merge.`,
      );
    }

    this.logger.log(
      `[SUCCESS] Merged transcript contains ${merged.length} entries (from ${totalEntries} total segment entries)`,
    );
    
    // Log first and last entries for verification
    if (merged.length > 0) {
      this.logger.log(
        `[DEBUG] First entry: ${merged[0].timestamp} ${merged[0].speaker}: "${merged[0].text.substring(0, 50)}..."`,
      );
      this.logger.log(
        `[DEBUG] Last entry: ${merged[merged.length - 1].timestamp} ${merged[merged.length - 1].speaker}: "${merged[merged.length - 1].text.substring(0, 50)}..."`,
      );
    }
    
    return merged;
  }

  async generateSummary(
    mergedTranscript: Array<{
      speaker: string;
      text: string;
      start: number;
      end: number;
      timestamp: string;
    }>,
  ): Promise<{ summary: string; formattedLines: any[] }> {
    this.logger.log(
      `Generating summary from merged transcript (${mergedTranscript.length} entries)`,
    );

    // Validate transcript is not empty
    if (!mergedTranscript || mergedTranscript.length === 0) {
      this.logger.error(
        `[ERROR] Cannot generate summary from empty transcript!`,
      );
      throw new Error('Cannot generate summary from empty transcript');
    }

    this.logger.log(
      `[DEBUG] First transcript entry: ${JSON.stringify(mergedTranscript[0])}`,
    );
    this.logger.log(
      `[DEBUG] Last transcript entry: ${JSON.stringify(mergedTranscript[mergedTranscript.length - 1])}`,
    );

    try {
      const response = await axios.post<{
        summary?: string;
        formattedLines?: Array<{
          speaker: string;
          text: string;
          timestamp?: string;
        }>;
      }>(`${this.pythonServiceUrl}/generate-summary`, {
        transcript: mergedTranscript,
      });

      return {
        summary: response.data.summary || '',
        formattedLines: response.data.formattedLines || [],
      };
    } catch (error) {
      this.logger.error(`Failed to generate summary: ${error}`);
      throw new Error(`Summary generation failed: ${error}`);
    }
  }

  private formatTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `[${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}]`;
    }
    return `[${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}]`;
  }
}
