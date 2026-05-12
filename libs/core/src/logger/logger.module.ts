import { Global, Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './winston.config';
import { AppLogger } from './app-logger.service';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';

@Global()
@Module({
  imports: [WinstonModule.forRoot(winstonConfig)],
  providers: [AppLogger, LoggingInterceptor],
  exports: [WinstonModule, AppLogger, LoggingInterceptor],
})
export class LoggerModule {}
