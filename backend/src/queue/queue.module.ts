import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AUDIO_PROCESSING_QUEUE } from './audio-processing.queue';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: parseInt(configService.get<string>('REDIS_PORT', '6379'), 10),
        },
      }),
    }),
    BullModule.registerQueue({
      name: AUDIO_PROCESSING_QUEUE,
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
