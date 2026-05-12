import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RedisLockService {
  constructor(private readonly redisService: RedisService) {}

  async acquire(lockKey: string, ttlSeconds = 30): Promise<string | null> {
    const token = uuidv4();
    const result = await this.redisService
      .getClient()
      .set(lockKey, token, 'EX', ttlSeconds, 'NX');
    return result === 'OK' ? token : null;
  }

  async release(lockKey: string, token: string): Promise<void> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    await this.redisService.getClient().eval(script, 1, lockKey, token);
  }

  async withLock<T>(
    lockKey: string,
    fn: () => Promise<T>,
    ttlSeconds = 30,
  ): Promise<T | null> {
    const token = await this.acquire(lockKey, ttlSeconds);
    if (!token) return null;
    try {
      return await fn();
    } finally {
      await this.release(lockKey, token);
    }
  }
}
