import { Injectable, Inject, Scope } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

export interface LogMeta {
  context?: string;
  traceId?: string;
  userId?: number | string;
  method?: string;
  duration?: number;
  [key: string]: any;
}

@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger {
  private contextName?: string;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly winston: Logger,
  ) {}

  setContext(context: string) {
    this.contextName = context;
  }

  private buildMeta(meta?: LogMeta): Record<string, any> {
    return {
      ...(this.contextName ? { context: this.contextName } : {}),
      ...meta,
    };
  }

  info(message: string, meta?: LogMeta) {
    this.winston.info(message, this.buildMeta(meta));
  }

  error(message: string, error?: Error | unknown, meta?: LogMeta) {
    const errorMeta: Record<string, any> = {};
    if (error instanceof Error) {
      errorMeta.errorName = error.name;
      errorMeta.errorMessage = error.message;
      errorMeta.stack = error.stack;
    } else if (error !== undefined) {
      errorMeta.error = String(error);
    }
    this.winston.error(message, this.buildMeta({ ...meta, ...errorMeta }));
  }

  warn(message: string, meta?: LogMeta) {
    this.winston.warn(message, this.buildMeta(meta));
  }

  debug(message: string, meta?: LogMeta) {
    this.winston.debug(message, this.buildMeta(meta));
  }
}
