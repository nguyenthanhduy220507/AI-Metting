import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
  ForbiddenException,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import multer from 'multer';
import { MeetingCallbackDto } from './dto/callback.dto';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { StorageService } from '../storage/storage.service';
import { promises as fs } from 'fs';

@Controller('meetings')
export class MeetingsController {
  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 1024 * 1024 * 512 },
    }),
  )
  create(
    @Body() createMeetingDto: CreateMeetingDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.meetingsService.create(createMeetingDto, file);
  }

  @Get()
  findAll() {
    return this.meetingsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.meetingsService.findOne(id);
  }

  @Get(':id/status')
  async getStatus(@Param('id') id: string) {
    const meeting = await this.meetingsService.findOne(id);
    return {
      id: meeting.id,
      status: meeting.status,
      updatedAt: meeting.updatedAt,
    };
  }

  @Get(':id/audio')
  async getAudio(@Param('id') id: string, @Res() res: Response) {
    const meeting = await this.meetingsService.findOne(id);
    if (!meeting.uploads || meeting.uploads.length === 0) {
      throw new NotFoundException('No audio file found for this meeting');
    }

    const upload = meeting.uploads[0];
    const absolutePath = this.storageService.getAbsolutePath(upload.storagePath);

    try {
      await fs.access(absolutePath);
    } catch {
      throw new NotFoundException('Audio file not found on disk');
    }

    const fileStats = await fs.stat(absolutePath);
    const fileStream = await fs.readFile(absolutePath);

    res.setHeader('Content-Type', upload.mimeType || 'audio/mpeg');
    res.setHeader('Content-Length', fileStats.size);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${upload.originalFilename}"`,
    );
    res.setHeader('Accept-Ranges', 'bytes');

    res.send(fileStream);
  }

  @Post(':id/callback')
  handleCallback(
    @Param('id') id: string,
    @Body() callbackDto: MeetingCallbackDto,
    @Headers('x-callback-token') token?: string,
  ) {
    const expectedToken = this.configService.get<string>('callbackToken');
    if (!token || token !== expectedToken) {
      throw new ForbiddenException('Invalid callback token');
    }
    return this.meetingsService.handleCallback(id, callbackDto);
  }

  @Post(':meetingId/segments/:segmentId/callback')
  async handleSegmentCallback(
    @Param('meetingId') meetingId: string,
    @Param('segmentId') segmentId: string,
    @Body()
    segmentResult: {
      transcript: Array<{
        speaker: string;
        text: string;
        start: number;
        end: number;
        timestamp?: string;
      }>;
    },
    @Headers('x-callback-token') token?: string,
  ) {
    const expectedToken = this.configService.get<string>('callbackToken');
    if (!token || token !== expectedToken) {
      throw new ForbiddenException('Invalid callback token');
    }
    return this.meetingsService.handleSegmentCallback(
      meetingId,
      segmentId,
      segmentResult,
    );
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateMeetingDto: UpdateMeetingDto) {
    return this.meetingsService.update(id, updateMeetingDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.meetingsService.removeMeeting(id);
  }
}
