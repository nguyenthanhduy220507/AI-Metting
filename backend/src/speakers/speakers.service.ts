import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Speaker, SpeakerStatus } from './entities/speaker.entity';
import { SpeakerSample } from './entities/speaker-sample.entity';
import { CreateSpeakerDto } from './dto/create-speaker.dto';
import { UpdateSpeakerDto } from './dto/update-speaker.dto';
import { StorageService } from '../storage/storage.service';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { Utterance } from '../meetings/entities/utterance.entity';
import { MeetingStatus } from '../meetings/entities/meeting.entity';

@Injectable()
export class SpeakersService {
  private readonly logger = new Logger(SpeakersService.name);

  constructor(
    @InjectRepository(Speaker)
    private readonly speakerRepository: Repository<Speaker>,
    @InjectRepository(SpeakerSample)
    private readonly sampleRepository: Repository<SpeakerSample>,
    @InjectRepository(Utterance)
    private readonly utteranceRepository: Repository<Utterance>,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
  ) {}

  async create(
    createSpeakerDto: CreateSpeakerDto,
    files: Express.Multer.File[],
  ): Promise<Speaker> {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one sample audio is required');
    }

    // Validate file formats - only audio files are supported
    const allowedMimeTypes = [
      'audio/wav',
      'audio/wave',
      'audio/x-wav',
      'audio/mpeg',
      'audio/mp3',
      'audio/mpeg3',
      'audio/x-mpeg-3',
      'audio/flac',
      'audio/x-flac',
      'audio/ogg',
      'audio/webm',
    ];
    const invalidFiles = files.filter(
      (file) => !allowedMimeTypes.includes(file.mimetype.toLowerCase()),
    );
    if (invalidFiles.length > 0) {
      const invalidNames = invalidFiles.map((f) => f.originalname).join(', ');
      throw new BadRequestException(
        `Unsupported file format. Only audio files are allowed (WAV, MP3, FLAC, OGG, WEBM). Invalid files: ${invalidNames}`,
      );
    }

    const existing = await this.speakerRepository.findOne({
      where: { name: createSpeakerDto.name },
    });
    if (existing) {
      throw new BadRequestException('Speaker name already exists');
    }

    const speaker = this.speakerRepository.create({
      name: createSpeakerDto.name.trim(),
      status: SpeakerStatus.PENDING,
    });
    await this.speakerRepository.save(speaker);

    const storedSamples: SpeakerSample[] = [];
    for (const file of files) {
      const storedFile = await this.storageService.saveFileToSubdir(
        file,
        `speakers/${speaker.id}`,
      );
      const sample = this.sampleRepository.create({
        speaker,
        originalFilename: file.originalname,
        storedFilename: storedFile.storedFilename,
        storagePath: storedFile.relativePath,
        mimeType: file.mimetype,
        size: file.size,
      });
      storedSamples.push(sample);
    }
    await this.sampleRepository.save(storedSamples);

    try {
      speaker.status = SpeakerStatus.ENROLLING;
      await this.speakerRepository.save(speaker);
      await this.triggerEnrollment(speaker, storedSamples);
      speaker.status = SpeakerStatus.ACTIVE;
    } catch (error) {
      this.logger.error(
        `Failed to enroll speaker ${speaker.name}: ${error instanceof Error ? error.message : error}`,
      );
      speaker.status = SpeakerStatus.FAILED;
      speaker.extra = {
        ...(speaker.extra ?? {}),
        enrollmentError: error instanceof Error ? error.message : String(error),
      };
    }

    await this.speakerRepository.save(speaker);
    return this.findOne(speaker.id);
  }

  async findAll(): Promise<Speaker[]> {
    const speakers = await this.speakerRepository.find({
      order: { createdAt: 'DESC' },
      relations: ['samples'],
    });

    // Count detections (meetings where speaker appears) for each speaker
    const detectionCounts = await this.utteranceRepository
      .createQueryBuilder('utterance')
      .select('utterance.speaker', 'speaker')
      .addSelect('COUNT(DISTINCT utterance.meetingId)', 'count')
      .innerJoin('utterance.meeting', 'meeting')
      .where('meeting.status = :status', { status: MeetingStatus.COMPLETED })
      .groupBy('utterance.speaker')
      .getRawMany();

    // Map detection counts to speakers
    const countsMap = new Map<string, number>();
    detectionCounts.forEach((row) => {
      countsMap.set(row.speaker, parseInt(row.count, 10));
    });

    // Add detectionCount to each speaker
    const speakersWithCounts = speakers.map((speaker) => ({
      ...speaker,
      detectionCount: countsMap.get(speaker.name) || 0,
    }));

    return speakersWithCounts;
  }

  async findOne(id: string): Promise<Speaker> {
    const speaker = await this.speakerRepository.findOne({
      where: { id },
      relations: ['samples'],
    });
    if (!speaker) {
      throw new NotFoundException('Speaker not found');
    }
    return speaker;
  }

  async getDetections(speakerId: string) {
    const speaker = await this.findOne(speakerId);

    // Query meetings where speaker appears
    const detections = await this.utteranceRepository
      .createQueryBuilder('utterance')
      .select('meeting.id', 'meetingId')
      .addSelect('meeting.title', 'title')
      .addSelect('meeting.createdAt', 'createdAt')
      .addSelect('COUNT(utterance.id)', 'utteranceCount')
      .innerJoin('utterance.meeting', 'meeting')
      .where('utterance.speaker = :speaker', { speaker: speaker.name })
      .andWhere('meeting.status = :status', { status: MeetingStatus.COMPLETED })
      .groupBy('meeting.id')
      .addGroupBy('meeting.title')
      .addGroupBy('meeting.createdAt')
      .orderBy('meeting.createdAt', 'DESC')
      .getRawMany();

    return {
      speaker: speaker.name,
      totalMeetings: detections.length,
      meetings: detections.map((d) => ({
        meetingId: d.meetingId,
        title: d.title || 'Untitled Meeting',
        createdAt: d.createdAt,
        utteranceCount: parseInt(d.utteranceCount, 10),
      })),
    };
  }

  private async triggerEnrollment(
    speaker: Speaker,
    samples: SpeakerSample[],
  ): Promise<void> {
    const pythonServiceUrl =
      this.configService.get<string>('PYTHON_SERVICE_URL') ||
      'http://localhost:5000';
    const token =
      this.configService.get<string>('PYTHON_SERVICE_CALLBACK_TOKEN') ?? null;

    const samplePaths = samples.map((sample) =>
      this.storageService.getAbsolutePath(sample.storagePath),
    );

    try {
      // Always use force=true to allow overwriting existing enrollments
      // This handles cases where speaker was enrolled before but needs to be updated
      const response = await axios.post(
        `${pythonServiceUrl}/enroll-speaker`,
        {
          speaker_name: speaker.name,
          sample_paths: samplePaths,
          force: true,
        },
        {
          timeout: 600000,
          headers: token ? { 'x-service-token': token } : undefined,
        },
      );
      this.logger.log(
        `Successfully enrolled speaker ${speaker.name}: ${JSON.stringify(response.data)}`,
      );
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.detail ||
        error?.message ||
        'Unknown error';
      const statusCode = error?.response?.status;

      // If 409, it means enrollment failed (no valid embeddings, etc.)
      if (statusCode === 409) {
        throw new BadRequestException(
          `Enrollment failed: ${errorMessage}. Please ensure all audio files are valid and contain clear speech.`,
        );
      }

      throw new InternalServerErrorException(
        `Python enroll request failed: ${errorMessage}`,
      );
    }
  }

  async syncFromPythonService(): Promise<{
    created: number;
    updated: number;
    skipped: number;
    total: number;
  }> {
    const pythonServiceUrl =
      this.configService.get<string>('PYTHON_SERVICE_URL') ||
      'http://localhost:5000';

    let speakerNames: string[];
    try {
      const response = await axios.get(`${pythonServiceUrl}/speakers/list`, {
        timeout: 30000,
      });
      speakerNames = response.data.speakers || [];
    } catch (error) {
      this.logger.error(
        `Failed to fetch speakers from Python service: ${error instanceof Error ? error.message : error}`,
      );
      throw new InternalServerErrorException(
        `Failed to fetch speakers from Python service: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }

    if (!Array.isArray(speakerNames) || speakerNames.length === 0) {
      this.logger.log('No speakers found in Python service');
      return { created: 0, updated: 0, skipped: 0, total: 0 };
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const speakerName of speakerNames) {
      if (!speakerName || typeof speakerName !== 'string') {
        this.logger.warn(`Invalid speaker name: ${speakerName}`);
        skipped++;
        continue;
      }

      const trimmedName = speakerName.trim();
      if (!trimmedName) {
        skipped++;
        continue;
      }

      const existing = await this.speakerRepository.findOne({
        where: { name: trimmedName },
      });

      if (existing) {
        // Update status to ACTIVE if it was FAILED or PENDING
        if (
          existing.status === SpeakerStatus.FAILED ||
          existing.status === SpeakerStatus.PENDING
        ) {
          existing.status = SpeakerStatus.ACTIVE;
          await this.speakerRepository.save(existing);
          updated++;
          this.logger.log(
            `Updated speaker ${trimmedName} status to ACTIVE`,
          );
        } else {
          skipped++;
        }
      } else {
        // Create new speaker with ACTIVE status
        const newSpeaker = this.speakerRepository.create({
          name: trimmedName,
          status: SpeakerStatus.ACTIVE,
          extra: {
            syncedFromPkl: true,
            syncedAt: new Date().toISOString(),
          },
        });
        await this.speakerRepository.save(newSpeaker);
        created++;
        this.logger.log(`Created new speaker ${trimmedName} from pkl sync`);
      }
    }

    this.logger.log(
      `Sync completed: ${created} created, ${updated} updated, ${skipped} skipped (total: ${speakerNames.length})`,
    );

    return {
      created,
      updated,
      skipped,
      total: speakerNames.length,
    };
  }

  async remove(id: string): Promise<void> {
    const speaker = await this.speakerRepository.findOne({
      where: { id },
    });

    if (!speaker) {
      throw new NotFoundException('Speaker not found');
    }

    const speakerName = speaker.name;
    const pythonServiceUrl =
      this.configService.get<string>('PYTHON_SERVICE_URL') ||
      'http://localhost:5000';

    // Delete from pkl first
    try {
      const deleteUrl = `${pythonServiceUrl}/speakers/${encodeURIComponent(speakerName)}`;
      this.logger.log(`Attempting to delete speaker ${speakerName} from pkl: ${deleteUrl}`);
      
      const response = await axios.delete(deleteUrl, {
        timeout: 30000,
      });
      
      this.logger.log(
        `Successfully deleted speaker ${speakerName} from pkl: ${JSON.stringify(response.data)}`,
      );
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.detail ||
        error?.message ||
        'Unknown error';
      const statusCode = error?.response?.status;

      // If 404, speaker doesn't exist in pkl, which is fine
      if (statusCode === 404) {
        this.logger.warn(
          `Speaker ${speakerName} not found in pkl (status 404), continuing with DB deletion`,
        );
      } else {
        // For other errors, log but continue with DB deletion
        this.logger.error(
          `Failed to delete speaker ${speakerName} from pkl (status ${statusCode}): ${errorMessage}. Continuing with DB deletion.`,
        );
        // Log full error for debugging
        if (error?.response) {
          this.logger.error(
            `Full error response: ${JSON.stringify(error.response.data)}`,
          );
        }
      }
    }

    // Delete from DB (cascade will delete samples automatically)
    await this.speakerRepository.remove(speaker);
    this.logger.log(`Successfully deleted speaker ${speakerName} from DB`);
  }

  async removeByName(speakerName: string): Promise<void> {
    const speaker = await this.speakerRepository.findOne({
      where: { name: speakerName },
    });

    if (!speaker) {
      this.logger.warn(
        `Speaker with name '${speakerName}' not found in DB. It may have been already deleted.`,
      );
      return;
    }

    await this.speakerRepository.remove(speaker);
    this.logger.log(`Successfully deleted speaker ${speakerName} from DB via callback`);
  }

  async update(id: string, updateSpeakerDto: UpdateSpeakerDto): Promise<Speaker> {
    const speaker = await this.speakerRepository.findOne({
      where: { id },
    });

    if (!speaker) {
      throw new NotFoundException('Speaker not found');
    }

    const newName = updateSpeakerDto.name.trim();
    const oldName = speaker.name;

    // Check if name is actually changing
    if (oldName === newName) {
      return this.findOne(id);
    }

    // Check if new name already exists
    const existing = await this.speakerRepository.findOne({
      where: { name: newName },
    });
    if (existing) {
      throw new BadRequestException('Speaker name already exists');
    }

    // Call Python service to rename in PKL
    const pythonServiceUrl =
      this.configService.get<string>('PYTHON_SERVICE_URL') ||
      'http://localhost:5000';
    const token =
      this.configService.get<string>('PYTHON_SERVICE_CALLBACK_TOKEN') ?? null;

    try {
      const response = await axios.put(
        `${pythonServiceUrl}/speakers/${encodeURIComponent(oldName)}/rename`,
        { new_name: newName },
        {
          timeout: 30000,
          headers: token ? { 'x-service-token': token } : undefined,
        },
      );
      this.logger.log(
        `Successfully renamed speaker in PKL: ${oldName} → ${newName}`,
      );
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.detail ||
        error?.message ||
        'Unknown error';
      const statusCode = error?.response?.status;

      // If 404, speaker doesn't exist in PKL
      if (statusCode === 404) {
        this.logger.warn(
          `Speaker ${oldName} not found in PKL (status 404). Continuing with DB update only.`,
        );
      } else if (statusCode === 409) {
        // New name already exists in PKL
        throw new BadRequestException(
          `Speaker name '${newName}' already exists in PKL`,
        );
      } else {
        // Other errors
        this.logger.error(
          `Failed to rename speaker in PKL (status ${statusCode}): ${errorMessage}`,
        );
        throw new InternalServerErrorException(
          `Failed to rename speaker in PKL: ${errorMessage}`,
        );
      }
    }

    // Update name in PostgreSQL
    speaker.name = newName;
    await this.speakerRepository.save(speaker);
    this.logger.log(`Successfully updated speaker name in DB: ${oldName} → ${newName}`);

    return this.findOne(id);
  }
}

