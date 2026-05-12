import { Controller, Post, Body, Inject, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { generateSchema } from '@anatine/zod-openapi';
import { IAuditLogger, AUDIT_LOGGER_TOKEN, Public } from '@core';
import { ZodValidationPipe } from '@core';
import { saveAuditEventSchema, SaveAuditEventDto } from './dto';

@ApiTags('Audit')
@Public()
@Controller('audit')
export class AuditController {
  constructor(
    @Inject(AUDIT_LOGGER_TOKEN) private readonly auditLogger: IAuditLogger,
  ) {}

  @Post('save')
  @ApiOperation({
    summary: 'Record an audit log',
    description: '记录一条审计日志(HTTP 请求或业务事件)',
  })
  @ApiBody({
    schema: generateSchema(saveAuditEventSchema, false, '3.0') as any,
  })
  @UsePipes(new ZodValidationPipe(saveAuditEventSchema))
  async save(@Body() event: SaveAuditEventDto) {
    await this.auditLogger.log(event);
    return { message: 'Audit log recorded' };
  }
}
