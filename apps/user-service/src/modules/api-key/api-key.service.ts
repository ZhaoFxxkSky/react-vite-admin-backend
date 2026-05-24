import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@core';
import { CreateApiKeyDto, ListApiKeyDto } from './dto';
import { randomBytes } from 'crypto';

@Injectable()
export class ApiKeyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateApiKeyDto) {
    const key = `ak_${randomBytes(16).toString('hex')}`;
    const secret = randomBytes(32).toString('hex');

    const expiresAt = dto.expiresDays
      ? new Date(Date.now() + dto.expiresDays * 24 * 60 * 60 * 1000)
      : null;

    return this.prisma.apiKey.create({
      data: {
        userId,
        name: dto.name,
        key,
        secret,
        permissions: dto.permissions,
        rateLimit: dto.rateLimit,
        expiresAt,
      },
    });
  }

  async list(userId: number, dto: ListApiKeyDto) {
    const [list, total] = await Promise.all([
      this.prisma.apiKey.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (dto.current - 1) * dto.pageSize,
        take: dto.pageSize,
      }),
      this.prisma.apiKey.count({ where: { userId } }),
    ]);

    // 不返回 secret
    const safeList = list.map((item) => ({
      ...item,
      secret: undefined,
    }));

    return {
      list: safeList,
      pagination: {
        current: dto.current,
        pageSize: dto.pageSize,
        total,
      },
    };
  }

  async delete(userId: number, id: number) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id, userId },
    });

    if (!apiKey) {
      throw new NotFoundException('API Key not found');
    }

    return this.prisma.apiKey.delete({ where: { id } });
  }

  async updateStatus(userId: number, id: number, status: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id, userId },
    });

    if (!apiKey) {
      throw new NotFoundException('API Key not found');
    }

    return this.prisma.apiKey.update({
      where: { id },
      data: { status },
    });
  }

  async validateApiKey(key: string, secret: string) {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { key },
    });

    if (!apiKey) {
      return null;
    }

    if (apiKey.status !== 'active') {
      throw new ForbiddenException('API Key is inactive');
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new ForbiddenException('API Key has expired');
    }

    if (apiKey.secret !== secret) {
      return null;
    }

    // 更新最后使用时间
    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return apiKey;
  }
}
