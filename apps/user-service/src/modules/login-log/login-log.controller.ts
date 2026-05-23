import { Controller, Post, Body, UseGuards, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { generateSchema } from '@anatine/zod-openapi';
import { LoginLogService } from './login-log.service';
import { listLoginLogSchema, ListLoginLogDto } from './dto';
import {
  ZodValidationPipe,
  PermissionsGuard,
  ApiPermission,
  JwtGuard,
} from '@core';

@ApiTags('LoginLogs')
@ApiBearerAuth()
@Controller('login-logs')
@UseGuards(JwtGuard, PermissionsGuard)
export class LoginLogController {
  constructor(private readonly loginLogService: LoginLogService) {}

  @Post('listByPage')
  @ApiPermission({
    code: 'system:login-log:list',
    name: '查询登录日志',
    module: '登录日志',
  })
  @ApiOperation({
    summary: 'Page login logs',
    description: '分页查询登录日志',
  })
  @ApiBody({
    schema: generateSchema(listLoginLogSchema) as any,
  })
  @UsePipes(new ZodValidationPipe(listLoginLogSchema))
  listByPage(@Body() dto: ListLoginLogDto) {
    return this.loginLogService.findMany(dto);
  }
}
