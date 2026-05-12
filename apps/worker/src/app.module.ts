import { Module } from '@nestjs/common';
import { ConfigModule, CacheModule, LoggerModule } from '@core';
import { SchedulerModule } from './modules/scheduler/scheduler.module';

@Module({
  imports: [
    ConfigModule.forRoot('apps/worker/config'),
    CacheModule,
    LoggerModule,
    SchedulerModule,
  ],
})
export class AppModule {}
