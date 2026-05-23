import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@core';
import { CreateNoticeDto, ListNoticeDto } from './dto';

@Injectable()
export class NoticeService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateNoticeDto, userId: number) {
    return this.prisma.notice.create({
      data: {
        title: dto.title,
        content: dto.content,
        type: dto.type,
        isTop: dto.isTop,
        isPopup: dto.isPopup,
        startAt: dto.startAt,
        endAt: dto.endAt ?? null,
        targetRoles: dto.targetRoles ?? [],
        createdBy: String(userId),
      },
    });
  }

  async list(dto: ListNoticeDto) {
    const [list, total] = await Promise.all([
      this.prisma.notice.findMany({
        orderBy: [
          { isTop: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: (dto.current - 1) * dto.pageSize,
        take: dto.pageSize,
      }),
      this.prisma.notice.count(),
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

  async getById(id: number) {
    const notice = await this.prisma.notice.findUnique({
      where: { id },
    });
    if (!notice) throw new NotFoundException('Notice not found');
    return notice;
  }

  async update(id: number, dto: Partial<CreateNoticeDto>) {
    await this.getById(id);
    return this.prisma.notice.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: number) {
    await this.getById(id);
    return this.prisma.notice.delete({ where: { id } });
  }

  // 用户端：获取有效公告
  async getActiveNotices() {
    const now = new Date();
    return this.prisma.notice.findMany({
      where: {
        status: 'published',
        startAt: { lte: now },
        OR: [
          { endAt: null },
          { endAt: { gte: now } },
        ],
      },
      orderBy: [
        { isTop: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }
}
