import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Meeting } from '../meetings/entities/meeting.entity';
import { Upload } from '../meetings/entities/upload.entity';
import { Utterance } from '../meetings/entities/utterance.entity';
import { MeetingSegment } from '../meetings/entities/meeting-segment.entity';

export const typeOrmModuleOptions = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get('POSTGRES_HOST', 'localhost'),
  port: parseInt(configService.get('POSTGRES_PORT', '5432'), 10),
  username: configService.get('POSTGRES_USER', 'meeting'),
  password: configService.get('POSTGRES_PASSWORD', 'meeting'),
  database: configService.get('POSTGRES_DB', 'meeting_notes'),
  autoLoadEntities: true,
  synchronize: true,
  entities: [Meeting, Upload, Utterance, MeetingSegment],
});
