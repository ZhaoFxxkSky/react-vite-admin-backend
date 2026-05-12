import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { generateSchema } from '@anatine/zod-openapi';
import { PermissionService } from './permission.service';
import {
  createPermissionSchema,
  updatePermissionSchema,
  CreatePermissionDto,
  UpdatePermissionDto,
} from './dto';
import {
  ZodValidationPipe,
  JwtGuard,
  PermissionsGuard,
  ApiPermission,
  CurrentUser,
} from '@core';
import { AuthenticatedUser, removeByIdSchema, RemoveByIdDto } from '@shared';

@ApiTags('Permissions')
@ApiBearerAuth()
@Controller('permissions')
@UseGuards(JwtGuard, PermissionsGuard)
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get('listTree')
  @ApiPermission({
    code: 'system:permission:listTree',
    name: '查询权限树',
    module: '权限管理',
  })
  @ApiOperation({
    summary: 'List permission tree',
    description: '查询权限树形结构',
  })
  listTree() {
    return this.permissionService.listTree();
  }

  @Get('detail')
  @ApiPermission({
    code: 'system:permission:detail',
    name: '查询权限详情',
    module: '权限管理',
  })
  @ApiOperation({
    summary: 'Get permission by id',
    description: '根据 id 查询权限',
  })
  getById(@Query('id', ParseIntPipe) id: number) {
    return this.permissionService.getById(id);
  }

  @Post('create')
  @ApiPermission({
    code: 'system:permission:create',
    name: '创建权限',
    module: '权限管理',
  })
  @ApiOperation({ summary: 'Create permission', description: '新建权限' })
  @ApiBody({
    schema: generateSchema(createPermissionSchema, false, '3.0') as any,
  })
  @UsePipes(new ZodValidationPipe(createPermissionSchema))
  save(@Body() dto: CreatePermissionDto) {
    return this.permissionService.save(dto);
  }

  @Post('update')
  @ApiPermission({
    code: 'system:permission:update',
    name: '更新权限',
    module: '权限管理',
  })
  @ApiOperation({ summary: 'Update permission', description: '更新权限' })
  @ApiBody({
    schema: generateSchema(updatePermissionSchema, false, '3.0') as any,
  })
  @UsePipes(new ZodValidationPipe(updatePermissionSchema))
  updateById(@Body() body: UpdatePermissionDto) {
    const { id, ...patch } = body;
    return this.permissionService.updateById(id, patch as UpdatePermissionDto);
  }

  @Post('delete')
  @ApiPermission({
    code: 'system:permission:delete',
    name: '删除权限',
    module: '权限管理',
  })
  @ApiOperation({
    summary: 'Delete permission',
    description: '删除权限(内置权限禁止删除)',
  })
  @ApiBody({ schema: generateSchema(removeByIdSchema, false, '3.0') as any })
  @UsePipes(new ZodValidationPipe(removeByIdSchema))
  removeById(@Body() dto: RemoveByIdDto) {
    return this.permissionService.removeById(dto.id);
  }

  // ===================== 当前用户专属 =====================

  @Get('me/menu')
  @ApiOperation({
    summary: 'List menu for current user',
    description: '查询当前用户可见的菜单树(status=active)',
  })
  listMyMenu(@CurrentUser() user: AuthenticatedUser) {
    if (user.isSuperAdmin) {
      return this.permissionService.listTree();
    }
    return this.permissionService.listMenuByUserId(user.id);
  }

  @Get('me/codes')
  @ApiOperation({
    summary: 'List permission codes for current user',
    description: '查询当前用户拥有的全部权限码(去重)',
  })
  listMyCodes(@CurrentUser() user: AuthenticatedUser): Promise<string[]> {
    if (user.isSuperAdmin) {
      return Promise.resolve(['*']);
    }
    return this.permissionService.listCodesByUserId(user.id);
  }
}
