import { Module, Global } from '@nestjs/common';
import { AUDIT_LOGGER_TOKEN } from '@core';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditInterceptor } from './audit.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Global()
@Module({
  imports: [],
  controllers: [AuditController],
  providers: [
    AuditService,
    {
      provide: AUDIT_LOGGER_TOKEN,
      useClass: AuditService,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  exports: [AuditService, AUDIT_LOGGER_TOKEN],
})
export class AuditModule {}
