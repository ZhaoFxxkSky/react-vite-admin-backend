import { Controller, Get, Post, Body, UseGuards, UsePipes, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '@core';
import { JwtGuard } from '@app/user-platform';
import { Response } from 'express';
import { AuditLogService } from './audit-log.service';
import { ExcelService } from '../excel/excel.service';
import { ListAuditLogDto, listAuditLogSchema } from './dto';

@ApiTags('审计日志')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('audit-logs')
export class AuditLogController {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly excelService: ExcelService,
  ) {}

  @Get()
  @UsePipes(new ZodValidationPipe(listAuditLogSchema))
  async list(@Query() dto: ListAuditLogDto) {
    return this.auditLogService.list(dto);
  }

  @Post('export')
  @UsePipes(new ZodValidationPipe(listAuditLogSchema))
  async export(@Body() dto: ListAuditLogDto, @Res() res: Response) {
    const { list } = await this.auditLogService.list({ ...dto, current: 1, pageSize: 10000 });
    
    const headers = [
      { key: 'id', title: 'ID' },
      { key: 'userId', title: '用户ID' },
      { key: 'username', title: '用户名' },
      { key: 'action', title: '操作' },
      { key: 'resource', title: '模块' },
      { key: 'ip', title: 'IP' },
      { key: 'statusCode', title: '状态码' },
      { key: 'duration', title: '耗时(ms)' },
      { key: 'createdAt', title: '时间' },
    ];

    const buffer = this.excelService.export(list, headers);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.xlsx');
    res.send(buffer);
  }
}
