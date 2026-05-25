import { Injectable } from '@nestjs/common';
import { RedisService } from '@core';
import { SessionService } from '../session/session.service';

interface OnlineUser {
  userId: number;
  username: string;
  sessionId: string;
  loginAt: string;
  lastActiveAt: string;
  ip: string;
  userAgent: string;
}

@Injectable()
export class OnlineService {
  constructor(
    private readonly redisService: RedisService,
    private readonly sessionService: SessionService,
  ) {}

  private async scanSessions(pattern: string): Promise<string[]> {
    const redis = this.redisService.getClient();
    const keys: string[] = [];
    let cursor = '0';
    do {
      const result = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== '0');
    return keys;
  }

  async getOnlineUsers() {
    // 使用 SCAN 替代 KEYS 避免阻塞 Redis（生产环境大数据量场景）
    const sessionKeys = await this.scanSessions('session:*');
    const users: OnlineUser[] = [];

    for (const key of sessionKeys) {
      const sessionData = await this.redisService.get(key);
      if (sessionData) {
        try {
          const session = JSON.parse(sessionData);
          users.push({
            userId: session.userId,
            username: session.username,
            sessionId: key.replace('session:', ''),
            loginAt: session.loginAt,
            lastActiveAt: session.lastActiveAt || session.loginAt,
            ip: session.ip || '',
            userAgent: session.userAgent || '',
          });
        } catch {
          // 忽略解析错误的会话
        }
      }
    }

    return users;
  }

  async forceLogout(sessionId: string) {
    // 删除 Redis 中的会话
    await this.redisService.del(`session:${sessionId}`);
    return { message: 'User has been forced to logout' };
  }

  async getUserSessions(userId: number) {
    // 使用 SCAN 替代 KEYS 避免阻塞 Redis
    const sessionKeys = await this.scanSessions('session:*');
    const sessions: OnlineUser[] = [];

    for (const key of sessionKeys) {
      const sessionData = await this.redisService.get(key);
      if (sessionData) {
        try {
          const session = JSON.parse(sessionData);
          if (session.userId === userId) {
            sessions.push({
              userId: session.userId,
              username: session.username,
              sessionId: key.replace('session:', ''),
              loginAt: session.loginAt,
              lastActiveAt: session.lastActiveAt || session.loginAt,
              ip: session.ip || '',
              userAgent: session.userAgent || '',
            });
          }
        } catch {
          // 忽略解析错误的会话
        }
      }
    }

    return sessions;
  }

  async logoutOtherSessions(currentSessionId: string, userId: number) {
    const sessions = await this.getUserSessions(userId);
    let count = 0;

    for (const session of sessions) {
      if (session.sessionId !== currentSessionId) {
        await this.redisService.del(`session:${session.sessionId}`);
        count++;
      }
    }

    return { message: `Logged out ${count} other sessions` };
  }
}
