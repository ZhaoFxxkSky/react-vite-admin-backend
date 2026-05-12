import { NestFactory } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import { AppModule } from './app.module';
import { winstonConfig, AppLogger } from '@core';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: WinstonModule.createLogger(winstonConfig),
  });

  const logger = await app.resolve(AppLogger);
  logger.setContext('Worker');
  logger.info('Worker application started');
}

bootstrap();
