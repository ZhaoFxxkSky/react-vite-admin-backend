import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogService } from '../audit-log/audit-log.service';
import { Request } from 'express';

const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'authorization', 'creditCard'];

function maskSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(maskSensitiveData);

  const masked = { ...data };
  for (const key of Object.keys(masked)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.some((f) => lowerKey.includes(f))) {
      masked[key] = '[REDACTED]';
    } else if (typeof masked[key] === 'object') {
      masked[key] = maskSensitiveData(masked[key]);
    }
  }
  return masked;
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const startTime = Date.now();
    const method = request.method;

    // 只记录 POST/PUT/DELETE
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return next.handle();
    }

    const user = (request as any).user;
    const userId = user?.id;
    const username = user?.username;
    const ip = request.ip || request.socket.remoteAddress || '';
    const userAgent = request.headers['user-agent'] || '';
    const path = request.path;
    const body = request.body ? maskSensitiveData(request.body) : null;

    // 提取模块名
    const module = this.extractModule(path);

    return next.handle().pipe(
      tap(async (response) => {
        const duration = Date.now() - startTime;
        const statusCode = context.switchToHttp().getResponse().statusCode;

        await this.auditLogService.create({
          userId,
          username,
          action: method,
          module,
          description: `${method} ${path}`,
          method,
          path,
          params: body,
          ip,
          userAgent,
          statusCode,
          duration,
          isSensitive: this.isSensitive(path, method),
        });
      }),
    );
  }

  private extractModule(path: string): string {
    const segments = path.split('/').filter(Boolean);
    return segments[1] || 'unknown';
  }

  private isSensitive(path: string, method: string): boolean {
    const sensitivePaths = ['password', 'auth', 'permission', 'role'];
    const isSensitivePath = sensitivePaths.some((p) => path.includes(p));
    const isDelete = method === 'DELETE';
    return isSensitivePath || isDelete;
  }
}
