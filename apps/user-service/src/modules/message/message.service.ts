import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@core';
import { SendMessageDto, ListMessageDto } from './dto';

@Injectable()
export class MessageService {
  constructor(private readonly prisma: PrismaService) {}

  async send(senderId: number | null, dto: SendMessageDto) {
    return this.prisma.message.create({
      data: {
        senderId,
        receiverId: dto.receiverId,
        type: dto.type,
        title: dto.title,
        content: dto.content,
      },
    });
  }

  async list(userId: number, dto: ListMessageDto) {
    const where: any = { receiverId: userId };

    if (dto.type !== 'all') {
      where.type = dto.type;
    }
    if (dto.isRead !== undefined && dto.isRead !== null) {
      where.isRead = dto.isRead;
    }

    const [list, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (dto.current - 1) * dto.pageSize,
        take: dto.pageSize,
      }),
      this.prisma.message.count({ where }),
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

  async getUnreadCount(userId: number) {
    return this.prisma.message.count({
      where: {
        receiverId: userId,
        isRead: false,
      },
    });
  }

  async markAsRead(messageId: number, userId: number) {
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, receiverId: userId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: number) {
    const result = await this.prisma.message.updateMany({
      where: {
        receiverId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { count: result.count };
  }

  async delete(messageId: number, userId: number) {
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, receiverId: userId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return this.prisma.message.delete({
      where: { id: messageId },
    });
  }
}
