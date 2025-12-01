import { Module } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { MeetingsController } from './meetings.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Meeting } from './entities/meeting.entity';
import { Upload } from './entities/upload.entity';
import { Utterance } from './entities/utterance.entity';
import { MeetingSegment } from './entities/meeting-segment.entity';
import { StorageModule } from '../storage/storage.module';
import { JobsModule } from '../jobs/jobs.module';
import { QueueModule } from '../queue/queue.module';
import { AudioModule } from '../audio/audio.module';
import { SegmentProcessorWorker } from '../workers/segment-processor.worker';
import { MergeProcessorWorker } from '../workers/merge-processor.worker';

@Module({
  imports: [
    TypeOrmModule.forFeature([Meeting, Upload, Utterance, MeetingSegment]),
    StorageModule,
    JobsModule,
    QueueModule,
    AudioModule,
  ],
  controllers: [MeetingsController],
  providers: [MeetingsService, SegmentProcessorWorker, MergeProcessorWorker],
})
export class MeetingsModule {}
