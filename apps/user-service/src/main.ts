import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { AppModule } from './app.module';
import { bootstrapApp } from './bootstrap';
import { winstonConfig, AppLogger } from '@core';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonModule.createLogger(winstonConfig),
  });
  bootstrapApp(app);

  const configService = app.get(ConfigService);
  const port = configService.get('app.port') || 3000;

  await app.listen(port);

  const logger = await app.resolve(AppLogger);
  logger.setContext('Bootstrap');
  logger.info(`Application is running on: http://localhost:${port}`);
  logger.info(`Swagger docs: http://localhost:${port}/docs`);
}

bootstrap();
