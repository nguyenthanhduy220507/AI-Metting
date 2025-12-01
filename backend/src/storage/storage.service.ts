import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadRoot: string;

  constructor(private readonly configService: ConfigService) {
    const uploadDir = this.configService.get<string>('uploadDir', 'uploads');
    this.uploadRoot = join(process.cwd(), uploadDir);
  }

  async ensureUploadRoot(): Promise<void> {
    await fs.mkdir(this.uploadRoot, { recursive: true });
  }

  getUploadRoot(): string {
    return this.uploadRoot;
  }

  getAbsolutePath(relativePath: string): string {
    return join(this.uploadRoot, relativePath);
  }

  async saveUploadedFile(file: Express.Multer.File, meetingId: string) {
    return this.saveFileToSubdir(file, meetingId);
  }

  async savePayload(meetingId: string, filename: string, data: string) {
    await this.ensureUploadRoot();
    const dir = join(this.uploadRoot, meetingId);
    await fs.mkdir(dir, { recursive: true });
    const fullPath = join(dir, filename);
    await fs.writeFile(fullPath, data);
    return fullPath;
  }

  async saveFileToSubdir(file: Express.Multer.File, relativeDir: string) {
    if (!file) {
      throw new InternalServerErrorException('File buffer missing');
    }

    await this.ensureUploadRoot();
    const normalizedDir = join(relativeDir);
    const absoluteDir = join(this.uploadRoot, normalizedDir);
    await fs.mkdir(absoluteDir, { recursive: true });

    const extension = this.getExtension(file.originalname);
    const storedFilename = `${Date.now()}-${randomUUID()}${extension}`;
    const relativePath = join(normalizedDir, storedFilename);
    const absolutePath = join(this.uploadRoot, relativePath);

    try {
      await fs.writeFile(absolutePath, file.buffer);
    } catch (error) {
      this.logger.error('Failed to persist upload', error as Error);
      throw new InternalServerErrorException('Unable to store uploaded file');
    }

    return {
      storedFilename,
      relativePath,
      absolutePath,
    };
  }

  private getExtension(filename: string): string {
    const parts = /\.[^/.]+$/.exec(filename);
    return parts ? parts[0] : '';
  }
}
