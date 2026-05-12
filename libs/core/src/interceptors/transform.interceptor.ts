import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResponseWrapper<T> {
  code: number;
  message: string;
  data: T;
  timestamp: string;
  requestId: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ResponseWrapper<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseWrapper<T>> {
    const request = context.switchToHttp().getRequest();
    const requestId = request.headers['x-request-id'] || '';

    return next.handle().pipe(
      map((data) => {
        const response = context.switchToHttp().getResponse();
        if (response.headersSent) {
          return data;
        }
        return {
          code: 200,
          message: 'success',
          data,
          timestamp: new Date().toISOString(),
          requestId,
        };
      }),
    );
  }
}
