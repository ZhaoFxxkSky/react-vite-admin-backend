import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisLockService, AppLogger, LogMethod, RedisService } from '@core';
import {
  SESSION_METADATA_PREFIX,
  USER_SESSIONS_PREFIX,
  REFRESH_TOKEN_PREFIX,
} from '@shared';

@Injectable()
export class SchedulerService {
  constructor(
    private readonly redisLockService: RedisLockService,
    private readonly redisService: RedisService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(SchedulerService.name);
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  @LogMethod()
  async handleCleanup() {
    const result = await this.redisLockService.withLock(
      'lock:cleanup',
      async () => {
        this.logger.info('Running cleanup task...');
        const cleaned = await this.cleanupExpiredSessions();
        this.logger.info(`Cleanup task finished, cleaned ${cleaned} expired sessions`);
        return true;
      },
      300,
    );

    if (!result) {
      this.logger.debug('Cleanup task skipped, another instance is running');
    }
  }

  /**
   * 清理所有过期会话
   */
  private async cleanupExpiredSessions(): Promise<number> {
    const redis = this.redisService.getClient();
    let cursor = '0';
    let cleaned = 0;
    const now = Math.floor(Date.now() / 1000);

    do {
      const reply = await redis.scan(cursor, 'MATCH', `${SESSION_METADATA_PREFIX}*`, 'COUNT', 100);
      cursor = reply[0];
      const keys = reply[1];

      for (const key of keys) {
        const expiresAtStr = await redis.hget(key, 'expiresAt');
        if (!expiresAtStr) continue;

        const expiresAt = parseInt(expiresAtStr, 10);
        if (expiresAt < now) {
          const token = key.replace(SESSION_METADATA_PREFIX, '');
          const meta = await redis.hgetall(key);

          if (meta && meta.userId) {
            const userSetKey = `${USER_SESSIONS_PREFIX}${meta.userId}`;
            await redis.srem(userSetKey, token);
          }

          await redis.del(key);
          await redis.del(`${REFRESH_TOKEN_PREFIX}${token}`);
          cleaned++;
        }
      }
    } while (cursor !== '0');

    return cleaned;
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  @LogMethod()
  async handleDailyReport() {
    const result = await this.redisLockService.withLock(
      'lock:daily-report',
      async () => {
        this.logger.info('Generating daily report...');
        return true;
      },
      600,
    );

    if (!result) {
      this.logger.debug('Daily report skipped, another instance is running');
    }
  }
}
