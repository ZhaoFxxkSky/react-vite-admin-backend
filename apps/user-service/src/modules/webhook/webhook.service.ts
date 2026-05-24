import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@core';
import { CreateWebhookDto, ListWebhookDto } from './dto';
import axios from 'axios';
import { createHmac } from 'crypto';

@Injectable()
export class WebhookService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateWebhookDto) {
    return this.prisma.webhook.create({
      data: {
        userId,
        name: dto.name,
        url: dto.url,
        secret: dto.secret,
        events: dto.events,
      },
    });
  }

  async list(userId: number, dto: ListWebhookDto) {
    const [list, total] = await Promise.all([
      this.prisma.webhook.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (dto.current - 1) * dto.pageSize,
        take: dto.pageSize,
      }),
      this.prisma.webhook.count({ where: { userId } }),
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

  async delete(userId: number, id: number) {
    const webhook = await this.prisma.webhook.findFirst({
      where: { id, userId },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    return this.prisma.webhook.delete({ where: { id } });
  }

  async updateStatus(userId: number, id: number, status: string) {
    const webhook = await this.prisma.webhook.findFirst({
      where: { id, userId },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    return this.prisma.webhook.update({
      where: { id },
      data: { status },
    });
  }

  async triggerEvent(event: string, payload: any) {
    // 查找订阅了该事件的所有 webhook
    const webhooks = await this.prisma.webhook.findMany({
      where: {
        status: 'active',
      },
    });

    // 过滤出订阅了该事件的 webhook（JSON 数组包含检查）
    const filteredWebhooks = webhooks.filter((w: any) => {
      const events = w.events as string[];
      return Array.isArray(events) && events.includes(event);
    });

    // 并行发送 webhook（不阻塞主流程）
    await Promise.allSettled(
      filteredWebhooks.map(async (webhook) => {
        try {
          await this.sendWebhook(webhook, event, payload);
        } catch (error) {
          console.error(`Webhook delivery failed: ${webhook.url}`, error);
          await this.prisma.webhook.update({
            where: { id: webhook.id },
            data: {
              failCount: { increment: 1 },
            },
          });
        }
      }),
    );
  }

  private async sendWebhook(
    webhook: { url: string; secret: string },
    event: string,
    payload: any,
  ) {
    const timestamp = Date.now();
    const body = JSON.stringify({
      event,
      timestamp,
      data: payload,
    });

    const signature = createHmac('sha256', webhook.secret)
      .update(body)
      .digest('hex');

    await axios.post(webhook.url, body, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Webhook-Event': event,
        'X-Webhook-Timestamp': String(timestamp),
      },
      timeout: 10000,
    });
  }
}
