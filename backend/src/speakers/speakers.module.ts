import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpeakersService } from './speakers.service';
import { SpeakersController } from './speakers.controller';
import { Speaker } from './entities/speaker.entity';
import { SpeakerSample } from './entities/speaker-sample.entity';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [TypeOrmModule.forFeature([Speaker, SpeakerSample]), StorageModule],
  controllers: [SpeakersController],
  providers: [SpeakersService],
  exports: [SpeakersService],
})
export class SpeakersModule {}

