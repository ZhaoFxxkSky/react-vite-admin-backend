import { Injectable } from '@nestjs/common';
import { PrismaService, RedisService } from '@core';
import * as os from 'os';

@Injectable()
export class MonitorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async getSystemStats() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return {
      cpu: {
        loadavg: os.loadavg(),
        count: os.cpus().length,
      },
      memory: {
        total: this.formatBytes(totalMem),
        free: this.formatBytes(freeMem),
        used: this.formatBytes(usedMem),
        usage: ((usedMem / totalMem) * 100).toFixed(2) + '%',
      },
      uptime: os.uptime(),
      platform: os.platform(),
      hostname: os.hostname(),
    };
  }

  async getDatabaseStats() {
    const [
      userCount,
      roleCount,
      orgCount,
      auditLogCount,
      loginLogCount,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.role.count(),
      this.prisma.organization.count(),
      this.prisma.auditLog.count(),
      this.prisma.loginLog.count(),
    ]);

    return {
      userCount,
      roleCount,
      orgCount,
      auditLogCount,
      loginLogCount,
    };
  }

  async getOnlineStats() {
    const redis = this.redisService.getClient();
    const keys = await redis.keys('session:metadata:*');
    return {
      onlineCount: keys.length,
    };
  }

  async getApiStats() {
    // 获取最近24小时的审计日志统计
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const logs = await this.prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: yesterday,
        },
      },
      select: {
        statusCode: true,
        duration: true,
      },
    });

    const total = logs.length;
    const success = logs.filter((l) => (l.statusCode ?? 0) < 400).length;
    const error = total - success;
    const avgDuration = total > 0
      ? (logs.reduce((sum, l) => sum + (l.duration ?? 0), 0) / total).toFixed(2)
      : 0;

    return {
      totalRequests: total,
      successCount: success,
      errorCount: error,
      successRate: total > 0 ? ((success / total) * 100).toFixed(2) + '%' : '0%',
      avgDuration: avgDuration + 'ms',
    };
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
