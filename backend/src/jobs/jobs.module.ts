import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { ConfigModule } from '@nestjs/config';
import { QueueModule } from '../queue/queue.module';
import { AudioModule } from '../audio/audio.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Meeting } from '../meetings/entities/meeting.entity';
import { MeetingSegment } from '../meetings/entities/meeting-segment.entity';

@Module({
  imports: [
    ConfigModule,
    QueueModule,
    AudioModule,
    TypeOrmModule.forFeature([Meeting, MeetingSegment]),
  ],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
