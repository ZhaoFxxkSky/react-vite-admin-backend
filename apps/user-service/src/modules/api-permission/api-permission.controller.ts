import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { generateSchema } from '@anatine/zod-openapi';
import {
  ApiPermission,
  JwtGuard,
  PermissionsGuard,
  ZodValidationPipe,
} from '@core';
import { ApiPermissionScannerService } from './api-permission-scanner.service';
import { ApiPermissionService } from './api-permission.service';
import {
  toggleSchema,
  batchToggleSchema,
  ToggleDto,
  BatchToggleDto,
} from './dto';

@ApiTags('ApiPermissions')
@ApiBearerAuth()
@Controller('api-permissions')
@UseGuards(JwtGuard, PermissionsGuard)
export class ApiPermissionController {
  constructor(
    private readonly scannerService: ApiPermissionScannerService,
    private readonly apiPermissionService: ApiPermissionService,
  ) {}

  @Get('scan/preview')
  @ApiPermission({
    code: 'system:api-permission:scan',
    name: '扫描预览',
    module: '接口权限',
  })
  @ApiOperation({ summary: 'Preview scan diff', description: '预览扫描差异' })
  async preview() {
    return this.scannerService.preview();
  }

  @Post('scan')
  @ApiPermission({
    code: 'system:api-permission:sync',
    name: '手动同步',
    module: '接口权限',
  })
  @ApiOperation({
    summary: 'Trigger scan sync',
    description: '手动触发扫描同步',
  })
  async scan() {
    return this.scannerService.scanAndSync();
  }

  @Get('tree')
  @ApiPermission({
    code: 'system:api-permission:tree',
    name: '接口权限树',
    module: '接口权限',
  })
  @ApiOperation({
    summary: 'List API permission tree',
    description: '查询接口权限树形分组',
  })
  async tree() {
    return this.apiPermissionService.tree();
  }

  @Post('toggle')
  @ApiPermission({
    code: 'system:api-permission:toggle',
    name: '启停接口权限',
    module: '接口权限',
  })
  @ApiOperation({
    summary: 'Toggle API permission',
    description: '启停单个接口权限',
  })
  @ApiBody({ schema: generateSchema(toggleSchema, false, '3.0') as any })
  @UsePipes(new ZodValidationPipe(toggleSchema))
  async toggle(@Body() dto: ToggleDto) {
    await this.apiPermissionService.toggle(dto.id, dto.enabled);
  }

  @Post('batch-toggle')
  @ApiPermission({
    code: 'system:api-permission:batch-toggle',
    name: '批量启停接口权限',
    module: '接口权限',
  })
  @ApiOperation({
    summary: 'Batch toggle API permissions',
    description: '批量启停接口权限',
  })
  @ApiBody({ schema: generateSchema(batchToggleSchema, false, '3.0') as any })
  @UsePipes(new ZodValidationPipe(batchToggleSchema))
  async batchToggle(@Body() dto: BatchToggleDto) {
    await this.apiPermissionService.batchToggle(dto.ids, dto.enabled);
  }

  @Post('clean-disabled')
  @ApiPermission({
    code: 'system:api-permission:clean',
    name: '清理失效接口权限',
    module: '接口权限',
  })
  @ApiOperation({
    summary: 'Clean disabled API permissions',
    description: '清理已禁用的接口权限（物理删除）',
  })
  async cleanDisabled() {
    return this.apiPermissionService.cleanDisabled();
  }
}
