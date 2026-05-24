import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { generateSchema } from '@anatine/zod-openapi';
import { PasswordPolicyService } from './password-policy.service';
import { updatePasswordPolicySchema, UpdatePasswordPolicyDto } from './dto';
import {
  PermissionsGuard,
  ApiPermission,
  JwtGuard,
  ZodValidationPipe,
} from '@core';

@ApiTags('Password Policies')
@ApiBearerAuth()
@Controller('password-policy')
@UseGuards(JwtGuard, PermissionsGuard)
export class PasswordPolicyController {
  constructor(private readonly passwordPolicyService: PasswordPolicyService) {}

  @Get()
  @ApiPermission({
    code: 'system:password-policy:detail',
    name: '查询密码策略',
    module: '密码策略管理',
  })
  @ApiOperation({
    summary: 'Get password policy',
    description: '获取密码策略(不存在则创建默认策略)',
  })
  getPolicy() {
    return this.passwordPolicyService.getPolicy();
  }

  @Put()
  @ApiPermission({
    code: 'system:password-policy:update',
    name: '更新密码策略',
    module: '密码策略管理',
  })
  @ApiOperation({
    summary: 'Update password policy',
    description: '更新密码策略',
  })
  @ApiBody({
    schema: generateSchema(updatePasswordPolicySchema, false, '3.0') as any,
  })
  @UsePipes(new ZodValidationPipe(updatePasswordPolicySchema))
  updatePolicy(@Body() dto: UpdatePasswordPolicyDto) {
    return this.passwordPolicyService.updatePolicy(dto);
  }
}
