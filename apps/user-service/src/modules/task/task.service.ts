import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisLockService, AppLogger, LogMethod } from '@core';

@Injectable()
export class TaskService {
  constructor(
    private readonly redisLockService: RedisLockService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(TaskService.name);
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  @LogMethod()
  async handleCleanup() {
    const result = await this.redisLockService.withLock(
      'lock:cleanup',
      async () => {
        this.logger.info('Running cleanup task...');
        // Implement cleanup logic here
        return true;
      },
      300,
    );

    if (!result) {
      this.logger.debug('Cleanup task skipped, another instance is running');
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  @LogMethod()
  async handleDailyReport() {
    const result = await this.redisLockService.withLock(
      'lock:daily-report',
      async () => {
        this.logger.info('Generating daily report...');
        // Implement report generation here
        return true;
      },
      600,
    );

    if (!result) {
      this.logger.debug('Daily report skipped, another instance is running');
    }
  }
}
