import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import multer from 'multer';
import { ConfigService } from '@nestjs/config';
import { SpeakersService } from './speakers.service';
import { CreateSpeakerDto } from './dto/create-speaker.dto';
import { UpdateSpeakerDto } from './dto/update-speaker.dto';

@Controller('speakers')
export class SpeakersController {
  constructor(
    private readonly speakersService: SpeakersService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  findAll() {
    return this.speakersService.findAll();
  }

  @Post('sync-from-pkl')
  async syncFromPkl() {
    return this.speakersService.syncFromPythonService();
  }

  @Post('on-deleted')
  async onDeleted(
    @Body() body: { speaker_name: string },
    @Headers('x-callback-token') token?: string,
  ) {
    const expectedToken = this.configService.get<string>('callbackToken');
    if (!token || token !== expectedToken) {
      throw new ForbiddenException('Invalid callback token');
    }

    await this.speakersService.removeByName(body.speaker_name);
    return { message: 'Speaker deleted from DB' };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.speakersService.findOne(id);
  }

  @Get(':id/detections')
  getDetections(@Param('id') id: string) {
    return this.speakersService.getDetections(id);
  }

  @Post()
  @UseInterceptors(
    FilesInterceptor('samples', 5, {
      storage: multer.memoryStorage(),
      limits: { fileSize: 1024 * 1024 * 100 },
    }),
  )
  create(
    @Body() createSpeakerDto: CreateSpeakerDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.speakersService.create(createSpeakerDto, files);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateSpeakerDto: UpdateSpeakerDto,
  ) {
    return this.speakersService.update(id, updateSpeakerDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.speakersService.remove(id);
    return { message: 'Speaker deleted successfully' };
  }
}

