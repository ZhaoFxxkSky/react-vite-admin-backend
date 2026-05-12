import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditEvent, IAuditLogger, AUDIT_LOGGER_TOKEN } from '@core';
import { Inject } from '@nestjs/common';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @Inject(AUDIT_LOGGER_TOKEN) private readonly auditLogger: IAuditLogger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const startTime = Date.now();

    if (method === 'GET') {
      return next.handle();
    }

    const user = request.user;
    const userId = user?.id || null;
    const ip = request.ip;
    const userAgent = request.headers['user-agent'];
    const action = `${method} ${request.route?.path || request.url}`;
    const resource = context
      .getClass()
      .name.replace('Controller', '')
      .toLowerCase();

    return next.handle().pipe(
      tap(async () => {
        try {
          const duration = Date.now() - startTime;
          const res = context.switchToHttp().getResponse();
          const statusCode = res.statusCode || 200;

          const event: AuditEvent = {
            serviceName: 'user-service',
            eventType: 'http',
            userId: userId ?? undefined,
            action,
            resource,
            ip,
            userAgent,
            statusCode,
            duration,
            timestamp: new Date(),
          };

          await this.auditLogger.log(event);
        } catch {
          // Silently fail audit logging
        }
      }),
    );
  }
}
