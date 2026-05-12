import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule, CacheModule, LoggerModule } from '@core';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, CacheModule, LoggerModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
