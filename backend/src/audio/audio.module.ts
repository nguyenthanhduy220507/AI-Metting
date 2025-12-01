import { Module } from '@nestjs/common';
import { AudioSegmentationService } from './audio-segmentation.service';
import { AudioMergeService } from './audio-merge.service';
import { StorageModule } from '../storage/storage.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [StorageModule, ConfigModule],
  providers: [AudioSegmentationService, AudioMergeService],
  exports: [AudioSegmentationService, AudioMergeService],
})
export class AudioModule {}
