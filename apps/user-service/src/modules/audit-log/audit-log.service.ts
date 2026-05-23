import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core';
import { ListAuditLogDto } from './dto';

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId?: number;
    username?: string;
    action: string;
    module: string;
    description?: string;
    method?: string;
    path?: string;
    params?: any;
    ip?: string;
    userAgent?: string;
    statusCode?: number;
    duration?: number;
    isSensitive?: boolean;
  }) {
    return this.prisma.auditLog.create({
      data: {
        userId: data.userId ?? null,
        username: data.username ?? null,
        action: data.action,
        resource: data.module,
        ip: data.ip ?? null,
        userAgent: data.userAgent ?? null,
        statusCode: data.statusCode ?? null,
        duration: data.duration ?? null,
        metadata: {
          description: data.description,
          method: data.method,
          path: data.path,
          params: data.params,
          isSensitive: data.isSensitive,
        },
      },
    });
  }

  async list(dto: ListAuditLogDto) {
    const where: any = {};

    if (dto.userId) {
      where.userId = dto.userId;
    }
    if (dto.module) {
      where.resource = dto.module;
    }
    if (dto.action) {
      where.action = dto.action;
    }
    if (dto.isSensitive !== undefined && dto.isSensitive !== null) {
      where.metadata = {
        path: ['isSensitive'],
        equals: dto.isSensitive,
      };
    }
    if (dto.startDate || dto.endDate) {
      where.createdAt = {};
      if (dto.startDate) {
        where.createdAt.gte = dto.startDate;
      }
      if (dto.endDate) {
        where.createdAt.lte = dto.endDate;
      }
    }

    const [list, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (dto.current - 1) * dto.pageSize,
        take: dto.pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      list,
      pagination: {
        current: dto.current,
        pageSize: dto.pageSize,
        total,
      },
    };
  }
}
