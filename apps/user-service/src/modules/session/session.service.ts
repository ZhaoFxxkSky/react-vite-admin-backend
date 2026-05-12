import { Injectable } from '@nestjs/common';
import { AppLogger, LogMethod, PrismaService, RedisService } from '@core';
import {
  ACCESS_TOKEN_BLACKLIST_PREFIX,
  MAX_CONCURRENT_SESSIONS,
  PaginatedResponse,
  REFRESH_TOKEN_PREFIX,
  SESSION_METADATA_PREFIX,
  USER_SESSIONS_PREFIX,
} from '@shared';
import { UAParser } from 'ua-parser-js';
import { ListOnlineDto } from './dto';

interface CreateSessionMetadata {
  ip: string;
  userAgent: string;
  loginAt: string;
  expiresAt: number;
  accessTokenJti: string;
}

export interface OnlineSessionItem {
  userId: number;
  username: string;
  realName: string | null;
  nickName: string | null;
  isSuperAdmin: boolean;
  organizationName: string | null;
  jobTitle: string | null;
  roles: string[];
  sessionStatus: 'active' | 'idle';
  isCurrentSession: boolean;
  ip: string;
  deviceType: string;
  browser: string;
  os: string;
  userAgent: string;
  loginAt: string;
  lastActiveAt: string;
  lastRefreshAt: string | null;
  sessionDuration: number;
  refreshToken: string;
}

@Injectable()
export class SessionService {
  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(SessionService.name);
  }

  @LogMethod()
  async createSession(
    userId: number,
    username: string,
    refreshToken: string,
    metadata: CreateSessionMetadata,
  ) {
    const redis = this.redisService.getClient();
    const userSetKey = `${USER_SESSIONS_PREFIX}${userId}`;
    const metaKey = `${SESSION_METADATA_PREFIX}${refreshToken}`;

    const parser = new UAParser(metadata.userAgent);
    const deviceType = parser.getDevice().type || 'pc';
    const browser = parser.getBrowser().name || 'unknown';
    const os = parser.getOS().name || 'unknown';

    await this.enforceSessionLimit(userId);

    const ttl = metadata.expiresAt - Math.floor(Date.now() / 1000);

    const pipeline = redis.pipeline();
    pipeline.sadd(userSetKey, refreshToken);
    pipeline.hmset(metaKey, {
      userId: String(userId),
      username,
      ip: metadata.ip,
      userAgent: metadata.userAgent,
      deviceType,
      browser,
      os,
      loginAt: metadata.loginAt,
      lastActiveAt: metadata.loginAt,
      lastRefreshAt: metadata.loginAt,
      expiresAt: String(metadata.expiresAt),
      accessTokenJti: metadata.accessTokenJti,
    });
    pipeline.setex(
      `access_token_jti_map:${metadata.accessTokenJti}`,
      ttl,
      refreshToken,
    );
    if (ttl > 0) {
      pipeline.expire(metaKey, ttl);
      pipeline.expire(userSetKey, ttl);
    }
    await pipeline.exec();

    this.logger.debug(
      `Session created: userId=${userId}, token=${refreshToken.slice(0, 8)}...`,
    );
  }

  private async enforceSessionLimit(userId: number) {
    const redis = this.redisService.getClient();
    const userSetKey = `${USER_SESSIONS_PREFIX}${userId}`;
    const tokens = await redis.smembers(userSetKey);
    if (tokens.length < MAX_CONCURRENT_SESSIONS) {
      return;
    }

    const sessionsWithTime: Array<{ token: string; loginAt: number }> = [];
    for (const token of tokens) {
      const loginAtStr = await redis.hget(
        `${SESSION_METADATA_PREFIX}${token}`,
        'loginAt',
      );
      if (loginAtStr) {
        sessionsWithTime.push({
          token,
          loginAt: new Date(loginAtStr).getTime(),
        });
      }
    }

    sessionsWithTime.sort((a, b) => a.loginAt - b.loginAt);
    const toRemove = sessionsWithTime.slice(
      0,
      sessionsWithTime.length - MAX_CONCURRENT_SESSIONS + 1,
    );

    for (const { token } of toRemove) {
      const jti = await this.getAccessTokenJti(token);
      await this.removeSession(token);
      if (jti) {
        await this.blacklistAccessToken(jti, 15 * 60);
      }
      this.logger.info(
        `Session limit enforced: removed oldest session for userId=${userId}`,
      );
    }
  }

  @LogMethod()
  async removeSession(refreshToken: string) {
    const redis = this.redisService.getClient();
    const metaKey = `${SESSION_METADATA_PREFIX}${refreshToken}`;
    const meta = await redis.hgetall(metaKey);
    if (meta && meta.userId) {
      const userSetKey = `${USER_SESSIONS_PREFIX}${meta.userId}`;
      await redis.srem(userSetKey, refreshToken);
    }
    await redis.del(metaKey);
    await redis.del(`${REFRESH_TOKEN_PREFIX}${refreshToken}`);
    this.logger.debug(`Session removed: token=${refreshToken.slice(0, 8)}...`);
  }

  @LogMethod()
  async removeAllSessionsByUser(userId: number): Promise<number> {
    const redis = this.redisService.getClient();
    const userSetKey = `${USER_SESSIONS_PREFIX}${userId}`;
    const tokens = await redis.smembers(userSetKey);
    if (!tokens || tokens.length === 0) {
      return 0;
    }

    const jtis: string[] = [];
    for (const token of tokens) {
      const jti = await this.getAccessTokenJti(token);
      if (jti) {
        jtis.push(jti);
      }
    }

    const pipeline = redis.pipeline();
    for (const token of tokens) {
      pipeline.del(`${SESSION_METADATA_PREFIX}${token}`);
      pipeline.del(`${REFRESH_TOKEN_PREFIX}${token}`);
    }
    for (const jti of jtis) {
      pipeline.setex(`${ACCESS_TOKEN_BLACKLIST_PREFIX}${jti}`, 15 * 60, '1');
    }
    pipeline.del(userSetKey);
    await pipeline.exec();

    this.logger.info(
      `All sessions removed for userId=${userId}, count=${tokens.length}, blacklisted=${jtis.length}`,
    );
    return tokens.length;
  }

  @LogMethod()
  async listOnlineUsers(
    dto: ListOnlineDto,
    currentJti?: string,
  ): Promise<PaginatedResponse<OnlineSessionItem>> {
    const redis = this.redisService.getClient();
    const metaKeys: string[] = [];
    let cursor = '0';
    do {
      const reply = await redis.scan(
        cursor,
        'MATCH',
        `${SESSION_METADATA_PREFIX}*`,
        'COUNT',
        100,
      );
      cursor = reply[0];
      metaKeys.push(...reply[1]);
    } while (cursor !== '0');

    const now = Math.floor(Date.now() / 1000);
    const sessions: Array<{
      refreshToken: string;
      meta: Record<string, string>;
    }> = [];
    const userIds = new Set<number>();

    for (const key of metaKeys) {
      const meta = await redis.hgetall(key);
      if (!meta || !meta.userId) continue;
      const expiresAt = parseInt(meta.expiresAt, 10);
      if (expiresAt < now) {
        const token = key.replace(SESSION_METADATA_PREFIX, '');
        await this.removeSession(token);
        continue;
      }
      const token = key.replace(SESSION_METADATA_PREFIX, '');
      sessions.push({ refreshToken: token, meta });
      userIds.add(parseInt(meta.userId, 10));
    }

    const users =
      userIds.size > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: Array.from(userIds) } },
            select: {
              id: true,
              username: true,
              realName: true,
              nickName: true,
              isSuperAdmin: true,
              jobTitle: true,
              userOrganizations: {
                where: { isPrimary: true },
                select: { organizationId: true },
              },
              userRoles: {
                include: {
                  role: {
                    select: { name: true },
                  },
                },
              },
            },
          })
        : [];

    const orgIds = Array.from(
      new Set(
        users
          .map((u) => u.userOrganizations[0]?.organizationId)
          .filter(Boolean),
      ),
    ) as number[];
    const orgs =
      orgIds.length > 0
        ? await this.prisma.organization.findMany({
            where: { id: { in: orgIds } },
            select: { id: true, name: true },
          })
        : [];
    const orgMap = new Map(orgs.map((o) => [o.id, o.name]));

    const userMap = new Map(users.map((u) => [u.id, u]));

    const list = sessions.map(({ refreshToken, meta }) => {
      const user = userMap.get(parseInt(meta.userId, 10));
      const loginAt = new Date(meta.loginAt);
      const lastActiveAt = meta.lastActiveAt
        ? new Date(meta.lastActiveAt)
        : loginAt;
      const sessionDuration = Math.floor(
        (Date.now() - loginAt.getTime()) / 1000,
      );
      const isActive = Date.now() - lastActiveAt.getTime() < 5 * 60 * 1000;

      return {
        userId: parseInt(meta.userId, 10),
        username: meta.username,
        realName: user?.realName ?? null,
        nickName: user?.nickName ?? null,
        isSuperAdmin: user?.isSuperAdmin ?? false,
        organizationName: user?.userOrganizations[0]?.organizationId
          ? (orgMap.get(user.userOrganizations[0].organizationId) ?? null)
          : null,
        jobTitle: user?.jobTitle ?? null,
        roles: user?.userRoles.map((ur) => ur.role.name) ?? [],
        sessionStatus: (isActive ? 'active' : 'idle') as 'active' | 'idle',
        isCurrentSession: meta.accessTokenJti === currentJti,
        ip: meta.ip,
        deviceType: meta.deviceType || 'unknown',
        browser: meta.browser || 'unknown',
        os: meta.os || 'unknown',
        userAgent: meta.userAgent,
        loginAt: meta.loginAt,
        lastActiveAt: meta.lastActiveAt || meta.loginAt,
        lastRefreshAt: meta.lastRefreshAt || null,
        sessionDuration,
        refreshToken: refreshToken.slice(0, 8) + '...',
      };
    });

    let filtered = list;
    if (dto.keyword) {
      const lower = dto.keyword.toLowerCase();
      filtered = list.filter(
        (item) =>
          item.username.toLowerCase().includes(lower) ||
          (item.realName && item.realName.toLowerCase().includes(lower)) ||
          (item.nickName && item.nickName.toLowerCase().includes(lower)),
      );
    }

    const total = filtered.length;
    const start = (dto.current - 1) * dto.pageSize;
    const paginated = filtered.slice(start, start + dto.pageSize);
    return new PaginatedResponse(paginated, total, dto.current, dto.pageSize);
  }

  @LogMethod()
  async getOnlineUserDetail(userId: number) {
    const redis = this.redisService.getClient();
    const userSetKey = `${USER_SESSIONS_PREFIX}${userId}`;
    const tokens = await redis.smembers(userSetKey);
    if (!tokens || tokens.length === 0) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    const sessionList: Array<Record<string, unknown>> = [];

    for (const token of tokens) {
      const meta = await redis.hgetall(`${SESSION_METADATA_PREFIX}${token}`);
      if (!meta || !meta.userId) continue;
      const expiresAt = parseInt(meta.expiresAt, 10);
      if (expiresAt < now) {
        await this.removeSession(token);
        continue;
      }
      sessionList.push({
        refreshToken: token.slice(0, 8) + '...',
        ip: meta.ip,
        userAgent: meta.userAgent,
        deviceType: meta.deviceType || 'unknown',
        browser: meta.browser || 'unknown',
        os: meta.os || 'unknown',
        loginAt: meta.loginAt,
        lastActiveAt: meta.lastActiveAt || meta.loginAt,
        lastRefreshAt: meta.lastRefreshAt || null,
        expiresAt,
      });
    }

    if (sessionList.length === 0) {
      return null;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userOrganizations: {
          where: { isPrimary: true },
          select: { organizationId: true },
        },
        userRoles: {
          include: {
            role: { select: { name: true } },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    let organizationName: string | null = null;
    const primaryOrgId = user.userOrganizations[0]?.organizationId;
    if (primaryOrgId) {
      const org = await this.prisma.organization.findUnique({
        where: { id: primaryOrgId },
        select: { name: true },
      });
      organizationName = org?.name ?? null;
    }

    return {
      userId: user.id,
      username: user.username,
      realName: user.realName,
      nickName: user.nickName,
      isSuperAdmin: user.isSuperAdmin,
      organizationName,
      jobTitle: user.jobTitle,
      roles: user.userRoles.map((ur) => ur.role.name),
      sessions: sessionList,
    };
  }

  @LogMethod()
  async getUserSessions(userId: number) {
    const detail = await this.getOnlineUserDetail(userId);
    if (!detail) {
      return { sessions: [], total: 0 };
    }
    return {
      sessions: detail.sessions,
      total: detail.sessions.length,
    };
  }

  @LogMethod()
  async updateLastActiveByJti(jti: string) {
    const redis = this.redisService.getClient();
    const refreshToken = await redis.get(`access_token_jti_map:${jti}`);
    if (!refreshToken) {
      return;
    }

    const metaKey = `${SESSION_METADATA_PREFIX}${refreshToken}`;
    const lastActiveAt = await redis.hget(metaKey, 'lastActiveAt');
    if (lastActiveAt) {
      const lastTime = new Date(lastActiveAt).getTime();
      if (Date.now() - lastTime < 60 * 1000) {
        return;
      }
    }

    await redis.hset(metaKey, 'lastActiveAt', new Date().toISOString());
  }

  @LogMethod()
  async blacklistAccessToken(jti: string, ttlSeconds: number) {
    const redis = this.redisService.getClient();
    await redis.setex(
      `${ACCESS_TOKEN_BLACKLIST_PREFIX}${jti}`,
      ttlSeconds,
      '1',
    );
    this.logger.debug(`Access token blacklisted: jti=${jti}`);
  }

  async isAccessTokenBlacklisted(jti: string): Promise<boolean> {
    const redis = this.redisService.getClient();
    const result = await redis.get(`${ACCESS_TOKEN_BLACKLIST_PREFIX}${jti}`);
    return result === '1';
  }

  async getAccessTokenJti(refreshToken: string): Promise<string | null> {
    const redis = this.redisService.getClient();
    const jti = await redis.hget(
      `${SESSION_METADATA_PREFIX}${refreshToken}`,
      'accessTokenJti',
    );
    return jti || null;
  }

  @LogMethod()
  async cleanupExpiredSessions(): Promise<{ cleaned: number }> {
    const redis = this.redisService.getClient();
    let cursor = '0';
    let cleaned = 0;
    const now = Math.floor(Date.now() / 1000);

    do {
      const reply = await redis.scan(
        cursor,
        'MATCH',
        `${SESSION_METADATA_PREFIX}*`,
        'COUNT',
        100,
      );
      cursor = reply[0];
      const keys = reply[1];

      for (const key of keys) {
        const expiresAtStr = await redis.hget(key, 'expiresAt');
        if (!expiresAtStr) continue;
        const expiresAt = parseInt(expiresAtStr, 10);
        if (expiresAt < now) {
          const token = key.replace(SESSION_METADATA_PREFIX, '');
          await this.removeSession(token);
          cleaned++;
        }
      }
    } while (cursor !== '0');

    this.logger.info(`Cleanup expired sessions finished, cleaned=${cleaned}`);
    return { cleaned };
  }
}
