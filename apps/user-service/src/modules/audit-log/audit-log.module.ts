import { Module } from '@nestjs/common';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';
import { AuditAlertService } from './audit-alert.service';
import { AuditLogInterceptor } from './audit-log.interceptor';
import { ExcelModule } from '../excel/excel.module';
import { MessageModule } from '../message/message.module';

@Module({
  imports: [ExcelModule, MessageModule],
  controllers: [AuditLogController],
  providers: [AuditLogService, AuditAlertService, AuditLogInterceptor],
  exports: [AuditLogService, AuditAlertService, AuditLogInterceptor],
})
export class AuditLogModule {}
