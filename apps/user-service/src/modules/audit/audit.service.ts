import { Injectable } from '@nestjs/common';
import { PrismaService, IAuditLogger, AuditEvent } from '@core';

@Injectable()
export class AuditService implements IAuditLogger {
  constructor(private readonly prisma: PrismaService) {}

  async log(event: AuditEvent): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          serviceName: event.serviceName,
          eventType: event.eventType,
          userId: event.userId ?? null,
          action: event.action,
          resource: event.resource,
          resourceId: event.resourceId ?? null,
          ip: event.ip ?? null,
          userAgent: event.userAgent ?? null,
          statusCode: event.statusCode ?? null,
          duration: event.duration ?? null,
          metadata: (event.metadata as any) ?? undefined,
        },
      });
    } catch {
      // Silently fail audit logging to avoid breaking main flow
    }
  }
}
