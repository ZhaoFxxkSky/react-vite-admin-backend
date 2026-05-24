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
        startAt: new Date(dto.startAt),
        endAt: dto.endAt ? new Date(dto.endAt) : null,
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
      data: {
        ...dto,
        targetRoles: dto.targetRoles ? (dto.targetRoles as any) : undefined,
      },
    });
  }

  async delete(id: number) {
    await this.getById(id);
    return this.prisma.notice.delete({ where: { id } });
  }

  // 用户端：获取有效公告
  async getActiveNotices(userId: number, roleCodes: string[]) {
    const now = new Date();
    const notices = await this.prisma.notice.findMany({
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

    // 过滤角色
    const filteredNotices = notices.filter((notice: any) => {
      const targetRoles = notice.targetRoles as string[];
      if (!targetRoles || targetRoles.length === 0) return true;
      return roleCodes.some((role) => targetRoles.includes(role));
    });

    // 查询已读状态
    const readRecords = await this.prisma.noticeRead.findMany({
      where: { userId },
      select: { noticeId: true },
    });
    const readNoticeIds = new Set(readRecords.map((r) => r.noticeId));

    return notices.map((notice) => ({
      ...notice,
      isRead: readNoticeIds.has(notice.id),
    }));
  }

  // 获取未读公告数量
  async getUnreadCount(userId: number, roleCodes: string[]) {
    const notices = await this.getActiveNotices(userId, roleCodes);
    return notices.filter((n) => !n.isRead).length;
  }

  // 获取弹窗公告（未读的弹窗公告）
  async getPopupNotices(userId: number, roleCodes: string[]) {
    const notices = await this.getActiveNotices(userId, roleCodes);
    return notices.filter((n) => n.isPopup && !n.isRead);
  }

  // 标记已读
  async markAsRead(noticeId: number, userId: number) {
    await this.prisma.noticeRead.upsert({
      where: {
        noticeId_userId: {
          noticeId,
          userId,
        },
      },
      update: {},
      create: {
        noticeId,
        userId,
      },
    });
    return { success: true };
  }

  // 标记所有已读
  async markAllAsRead(userId: number) {
    const now = new Date();
    const notices = await this.prisma.notice.findMany({
      where: {
        status: 'published',
        startAt: { lte: now },
        OR: [
          { endAt: null },
          { endAt: { gte: now } },
        ],
      },
      select: { id: true },
    });

    for (const notice of notices) {
      await this.prisma.noticeRead.upsert({
        where: {
          noticeId_userId: {
            noticeId: notice.id,
            userId,
          },
        },
        update: {},
        create: {
          noticeId: notice.id,
          userId,
        },
      });
    }

    return { success: true, count: notices.length };
  }
}
