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
    const [userCount, roleCount, orgCount, auditLogCount, loginLogCount] =
      await Promise.all([
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

    // 使用 aggregate 避免 OOM（大数据量场景）
    const [totalAgg, successAgg, avgDurationAgg] = await Promise.all([
      this.prisma.auditLog.count({
        where: { createdAt: { gte: yesterday } },
      }),
      this.prisma.auditLog.count({
        where: {
          createdAt: { gte: yesterday },
          statusCode: { lt: 400 },
        },
      }),
      this.prisma.auditLog.aggregate({
        where: { createdAt: { gte: yesterday } },
        _avg: { duration: true },
      }),
    ]);

    const total = totalAgg;
    const success = successAgg;
    const error = total - success;
    const avgDuration = avgDurationAgg._avg?.duration ?? 0;

    return {
      totalRequests: total,
      successCount: success,
      errorCount: error,
      successRate:
        total > 0 ? ((success / total) * 100).toFixed(2) + '%' : '0%',
      avgDuration: avgDuration.toFixed(2) + 'ms',
    };
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
