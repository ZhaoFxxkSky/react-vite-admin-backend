import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AppLogger } from '../logger/app-logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLogger) {
    this.logger.setContext(LoggingInterceptor.name);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    const requestId = request.headers['x-request-id'] || '';
    const userId = request.user?.id;
    const now = Date.now();

    this.logger.info(`→ ${method} ${url}`, {
      traceId: requestId,
      userId,
      method,
      url,
    });

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - now;
        this.logger.info(`← ${method} ${url}  (${duration}ms)`, {
          traceId: requestId,
          userId,
          method,
          url,
          duration,
        });
      }),
    );
  }
}
