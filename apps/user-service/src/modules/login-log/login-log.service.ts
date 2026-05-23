import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core';
import { PaginatedResponse } from '@shared';
import { Prisma } from '@prisma/client';

@Injectable()
export class LoginLogService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.LoginLogCreateInput) {
    return this.prisma.loginLog.create({ data });
  }

  async findMany(query: {
    current: number;
    pageSize: number;
    userId?: number | null;
    username?: string | null;
    status?: string | null;
    startTime?: string | null;
    endTime?: string | null;
  }) {
    const where: Prisma.LoginLogWhereInput = {};

    if (query.userId != null) {
      where.userId = query.userId;
    }
    if (query.username) {
      where.username = { contains: query.username };
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.startTime || query.endTime) {
      where.createdAt = {};
      if (query.startTime) {
        where.createdAt.gte = new Date(query.startTime);
      }
      if (query.endTime) {
        where.createdAt.lte = new Date(query.endTime);
      }
    }

    const [list, total] = await Promise.all([
      this.prisma.loginLog.findMany({
        where,
        skip: (query.current - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.loginLog.count({ where }),
    ]);

    return new PaginatedResponse(list, total, query.current, query.pageSize);
  }
}
