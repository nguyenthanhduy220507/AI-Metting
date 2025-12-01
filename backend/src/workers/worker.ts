import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Worker');
  try {
    logger.log('Initializing worker application context...');
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    logger.log('Worker process started');
    logger.log('Processing jobs from queue...');
    logger.log('Worker is ready to process jobs');

    // Workers are registered in AppModule via @Processor decorators
    // They will automatically start processing jobs
    // This process will keep running until terminated

    process.on('SIGTERM', () => {
      logger.log('SIGTERM received, shutting down worker...');
      void app.close().then(() => {
        logger.log('Worker shutdown complete');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.log('SIGINT received, shutting down worker...');
      void app.close().then(() => {
        logger.log('Worker shutdown complete');
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error(`Failed to start worker: ${error}`);
    
    // Check for specific connection errors
    if (error instanceof Error) {
      if (error.message?.includes('ECONNREFUSED')) {
        logger.error('Connection refused error detected');
        if (error.message?.includes('3333')) {
          logger.error(
            'Worker is trying to connect to port 3333. This is not needed.',
          );
          logger.error(
            'Worker only needs Redis and PostgreSQL connections.',
          );
        } else if (error.message?.includes('6379')) {
          logger.error('Cannot connect to Redis on port 6379');
          logger.error('Please ensure Redis is running: docker compose up -d redis');
        } else if (error.message?.includes('5432')) {
          logger.error('Cannot connect to PostgreSQL on port 5432');
          logger.error(
            'Please ensure PostgreSQL is running: docker compose up -d postgres',
          );
        }
      }
      logger.error(`Error details: ${error.message}`);
      logger.error(`Stack trace: ${error.stack}`);
    }
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  const logger = new Logger('Worker');
  logger.error('Unhandled error in worker bootstrap:', error);
  process.exit(1);
});
