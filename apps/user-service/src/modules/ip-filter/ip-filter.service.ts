import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core';

interface IpRule {
  id: number;
  ip: string;
  type: 'white' | 'black';
  remark: string;
  createdAt: Date;
}

@Injectable()
export class IpFilterService {
  constructor(private readonly prisma: PrismaService) {}

  async getRules(type?: 'white' | 'black') {
    const where: any = {
      group: type === 'white' ? 'ip_whitelist' : 'ip_blacklist',
    };

    if (!type) {
      where.OR = [
        { group: 'ip_whitelist' },
        { group: 'ip_blacklist' },
      ];
    }

    const configs = await this.prisma.sysConfig.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return configs.map((c) => ({
      id: c.id,
      ip: c.value,
      type: c.group === 'ip_whitelist' ? 'white' : 'black',
      remark: c.description || '',
      createdAt: c.createdAt,
    }));
  }

  async addRule(ip: string, type: 'white' | 'black', remark?: string) {
    const group = type === 'white' ? 'ip_whitelist' : 'ip_blacklist';
    
    return this.prisma.sysConfig.create({
      data: {
        key: `ip_${type}_${Date.now()}`,
        value: ip,
        group,
        name: `${type === 'white' ? '白名单' : '黑名单'}: ${ip}`,
        description: remark || '',
        type: 'string',
      },
    });
  }

  async removeRule(id: number) {
    return this.prisma.sysConfig.delete({
      where: { id },
    });
  }

  // 自动封禁（登录失败次数过多）
  async autoBlock(ip: string, durationMinutes: number = 30) {
    const key = `ip_block_${ip}`;
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
    
    // 检查是否已存在
    const existing = await this.prisma.sysConfig.findUnique({
      where: { key },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.sysConfig.create({
      data: {
        key,
        value: ip,
        group: 'ip_blacklist',
        name: `自动封禁: ${ip}`,
        description: `登录失败次数过多，自动封禁至 ${expiresAt.toISOString()}`,
        type: 'string',
      },
    });
  }

  // 清理过期的自动封禁
  async cleanupExpiredBlocks() {
    // 获取所有自动封禁记录
    const blocks = await this.prisma.sysConfig.findMany({
      where: {
        group: 'ip_blacklist',
        key: { startsWith: 'ip_block_' },
      },
    });

    const now = new Date();
    let cleaned = 0;

    for (const block of blocks) {
      // 从 description 解析过期时间
      const match = block.description?.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
      if (match) {
        const expiresAt = new Date(match[1]);
        if (expiresAt < now) {
          await this.prisma.sysConfig.delete({
            where: { id: block.id },
          });
          cleaned++;
        }
      }
    }

    return { cleaned };
  }
}
