import { Controller, Get, Body, UseGuards, UsePipes, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '@app/user-platform';
import { JwtAuthGuard } from '@app/user-platform';
import { AuditLogService } from './audit-log.service';
import { ListAuditLogDto, listAuditLogSchema } from './dto';

@ApiTags('审计日志')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @UsePipes(new ZodValidationPipe(listAuditLogSchema))
  async list(@Query() dto: ListAuditLogDto) {
    return this.auditLogService.list(dto);
  }
}
