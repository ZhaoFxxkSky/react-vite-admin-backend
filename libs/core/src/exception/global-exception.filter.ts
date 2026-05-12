import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppLogger } from '../logger/app-logger.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLogger) {
    this.logger.setContext(GlobalExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    let exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    // JWT errors → 401
    if (exception instanceof Error) {
      const jwtErrors = ['TokenExpiredError', 'JsonWebTokenError', 'NotBeforeError'];
      if (jwtErrors.includes(exception.constructor.name)) {
        status = HttpStatus.UNAUTHORIZED;
        exceptionResponse = { message: exception.message };
      }
    }

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any).message || 'Internal server error';

    const code =
      typeof exceptionResponse === 'object' && (exceptionResponse as any).code
        ? (exceptionResponse as any).code
        : status;

    const rawRequestId = request.headers['x-request-id'];
    const requestId = Array.isArray(rawRequestId)
      ? rawRequestId[0]
      : rawRequestId || '';

    this.logger.error(
      `${request.method} ${request.url} ${status} - ${message}`,
      exception instanceof Error ? exception : undefined,
      {
        traceId: requestId,
        userId: (request.user as any)?.id,
        method: request.method,
        url: request.url,
        status,
      },
    );

    response.status(status).json({
      code,
      message: Array.isArray(message) ? message[0] : message,
      data: null,
      timestamp: new Date().toISOString(),
      requestId,
    });
  }
}
