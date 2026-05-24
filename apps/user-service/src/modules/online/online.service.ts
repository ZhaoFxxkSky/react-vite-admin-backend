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

  async getOnlineUsers() {
    // 从 Redis 获取所有活跃会话
    const redis = this.redisService.getClient();
    const sessionKeys = await redis.keys('session:*');
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
    // 获取当前用户的所有会话
    const redis = this.redisService.getClient();
    const sessionKeys = await redis.keys('session:*');
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
