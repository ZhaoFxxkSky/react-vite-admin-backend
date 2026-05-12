import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  ParseIntPipe,
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
import { PrismaService } from '@core';
import {
  DATA_SCOPE_OPTIONS,
  DIMENSION_OPTIONS,
  ACTION_OPTIONS,
} from '@core/data-scope/data-scope.constants';
import { DataPermissionService } from './data-permission.service';
import { OrganizationService } from '../organization/organization.service';
import { UserDataScopeResolver } from './data-scope.resolver';
import {
  saveRoleScopesSchema,
  SaveRoleScopesDto,
  resolveDataScopeSchema,
  ResolveDataScopeDto,
} from './dto';

@ApiTags('数据权限')
@Controller('data-permissions')
@ApiBearerAuth()
@UseGuards(JwtGuard, PermissionsGuard)
export class DataPermissionController {
  constructor(
    private readonly dataPermService: DataPermissionService,
    private readonly orgService: OrganizationService,
    private readonly resolver: UserDataScopeResolver,
    private readonly prisma: PrismaService,
  ) {}

  @Get('metadata')
  @ApiOperation({ summary: '获取数据权限元数据（用于前端配置弹窗）' })
  @ApiPermission({
    code: 'system:data-permission:metadata',
    name: '获取数据权限元数据',
    module: '数据权限',
  })
  async getMetadata() {
    const resources = await this.dataPermService.listResourceMeta();
    const departments = await this.orgService.listTree();

    return {
      resources,
      scopeOptions: DATA_SCOPE_OPTIONS,
      dimensionOptions: DIMENSION_OPTIONS,
      actionOptions: ACTION_OPTIONS,
      departments,
    };
  }

  @Get('roleScopes')
  @ApiOperation({ summary: '获取角色的数据权限配置' })
  @ApiPermission({
    code: 'system:data-permission:role-scope:list',
    name: '查询角色数据权限',
    module: '数据权限',
  })
  async getRoleScopes(@Query('roleId', ParseIntPipe) roleId: number) {
    const resources = await this.dataPermService.listResourcesByRoleId(roleId);
    return { roleId, resources };
  }

  @Post('saveRoleScopes')
  @ApiOperation({ summary: '保存角色数据权限配置' })
  @ApiPermission({
    code: 'system:data-permission:role-scope:save',
    name: '保存角色数据权限',
    module: '数据权限',
  })
  @ApiBody({
    schema: generateSchema(saveRoleScopesSchema, false, '3.0') as any,
  })
  @UsePipes(new ZodValidationPipe(saveRoleScopesSchema))
  async saveRoleScopes(@Body() body: SaveRoleScopesDto) {
    await this.dataPermService.saveRoleScopes(body.roleId, body.resources);
    return { roleId: body.roleId };
  }

  @Post('internal/resolve')
  @ApiOperation({ summary: '内部接口：解析数据权限配置' })
  @ApiBody({ schema: generateSchema(resolveDataScopeSchema) as any })
  @UsePipes(new ZodValidationPipe(resolveDataScopeSchema))
  async resolveDataScope(@Body() dto: ResolveDataScopeDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true, isSuperAdmin: true },
    });
    if (!user) {
      return null;
    }
    return this.resolver.resolve(user, dto.resourceCode, dto.action);
  }
}
