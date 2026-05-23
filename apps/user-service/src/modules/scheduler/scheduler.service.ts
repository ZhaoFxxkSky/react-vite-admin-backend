import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@core';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  // 每天凌晨 3 点清理 90 天前的审计日志
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanAuditLogs() {
    this.logger.log('Starting audit log cleanup task...');
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: ninetyDaysAgo,
        },
      },
    });

    this.logger.log(`Deleted ${result.count} audit logs older than 90 days`);
  }

  // 每小时检查一次过期公告
  @Cron(CronExpression.EVERY_HOUR)
  async archiveExpiredNotices() {
    this.logger.log('Archiving expired notices...');
    const now = new Date();

    const result = await this.prisma.notice.updateMany({
      where: {
        status: 'published',
        endAt: {
          lt: now,
        },
      },
      data: {
        status: 'archived',
      },
    });

    this.logger.log(`Archived ${result.count} expired notices`);
  }

  // 每天凌晨 4 点清理过期文件记录
  @Cron('0 4 * * *')
  async cleanExpiredFiles() {
    this.logger.log('Starting expired files cleanup...');
    // 清理 30 天前的临时文件记录
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // TODO: 实际删除文件系统中的文件
    this.logger.log('Expired files cleanup completed');
  }
}
