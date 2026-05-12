import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  UsePipes,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { generateSchema } from '@anatine/zod-openapi';
import { RoleService } from './role.service';
import {
  createRoleSchema,
  updateRoleSchema,
  listRoleByPageSchema,
  assignRoleUsersSchema,
  setRolePermissionsSchema,
  setRoleApiPermissionsSchema,
  CreateRoleDto,
  UpdateRoleDto,
  ListRoleByPageDto,
  AssignRoleUsersDto,
  SetRolePermissionsDto,
  SetRoleApiPermissionsDto,
} from './dto';
import {
  ApiPermission,
  PermissionsGuard,
  JwtGuard,
  ZodValidationPipe,
} from '@core';
import { removeByIdSchema, RemoveByIdDto } from '@shared';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(JwtGuard, PermissionsGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get('list')
  @ApiOperation({
    summary: 'List roles',
    description: '查询全部角色(不分页)',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    type: String,
    description: '角色类型(system/custom)',
    example: 'custom',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: '角色状态',
  })
  list(@Query('type') type?: string, @Query('status') status?: string) {
    return this.roleService.list({ type, status });
  }

  @Post('listByPage')
  @ApiPermission({
    code: 'system:role:list',
    name: '分页查询角色',
    module: '角色管理',
  })
  @ApiOperation({ summary: 'Page roles', description: '分页查询角色列表' })
  @ApiBody({
    schema: generateSchema(listRoleByPageSchema, false, '3.0') as any,
  })
  @UsePipes(new ZodValidationPipe(listRoleByPageSchema))
  listByPage(@Body() query: ListRoleByPageDto) {
    return this.roleService.listByPage(query);
  }

  @Get('detail')
  @ApiPermission({
    code: 'system:role:detail',
    name: '查询角色详情',
    module: '角色管理',
  })
  @ApiOperation({
    summary: 'Get role by id',
    description: '查询单个角色详情(含权限 id 列表)',
  })
  getById(@Query('id', ParseIntPipe) id: number) {
    return this.roleService.getById(id);
  }

  @Post('create')
  @ApiPermission({
    code: 'system:role:create',
    name: '创建角色',
    module: '角色管理',
  })
  @ApiOperation({
    summary: 'Create role',
    description: '新建角色(可在创建时附带权限 id 列表)',
  })
  @ApiBody({ schema: generateSchema(createRoleSchema, false, '3.0') as any })
  @UsePipes(new ZodValidationPipe(createRoleSchema))
  save(@Body() dto: CreateRoleDto) {
    return this.roleService.save(dto);
  }

  @Post('update')
  @ApiPermission({
    code: 'system:role:update',
    name: '更新角色',
    module: '角色管理',
  })
  @ApiOperation({
    summary: 'Update role',
    description: '更新角色;permissionIds 不为 null 时会全量覆盖',
  })
  @ApiBody({ schema: generateSchema(updateRoleSchema, false, '3.0') as any })
  @UsePipes(new ZodValidationPipe(updateRoleSchema))
  updateById(@Body() body: UpdateRoleDto) {
    const { id, ...patch } = body;
    return this.roleService.updateById(id, patch as UpdateRoleDto);
  }

  @Post('delete')
  @ApiPermission({
    code: 'system:role:delete',
    name: '删除角色',
    module: '角色管理',
  })
  @ApiOperation({
    summary: 'Delete role',
    description: '删除角色(系统角色禁止删除)',
  })
  @ApiBody({ schema: generateSchema(removeByIdSchema, false, '3.0') as any })
  @UsePipes(new ZodValidationPipe(removeByIdSchema))
  removeById(@Body() dto: RemoveByIdDto) {
    return this.roleService.removeById(dto.id);
  }

  // ===================== 角色 ↔ 菜单权限 =====================

  @Get('permissions')
  @ApiPermission({
    code: 'system:role:permission:list',
    name: '查询角色菜单权限',
    module: '角色管理',
  })
  @ApiOperation({
    summary: 'List permissions of a role',
    description: '查询某个角色绑定的菜单权限列表',
  })
  listPermissionsByRoleId(@Query('roleId', ParseIntPipe) roleId: number) {
    return this.roleService.listPermissionsByRoleId(roleId);
  }

  @Post('setPermissions')
  @ApiPermission({
    code: 'system:role:permission:update',
    name: '设置角色菜单权限',
    module: '角色管理',
  })
  @ApiOperation({
    summary: 'Set permissions of a role',
    description: '全量覆盖角色的菜单权限列表',
  })
  @ApiBody({
    schema: generateSchema(setRolePermissionsSchema, false, '3.0') as any,
  })
  @UsePipes(new ZodValidationPipe(setRolePermissionsSchema))
  setPermissionsByRoleId(@Body() body: SetRolePermissionsDto) {
    return this.roleService.setPermissionsByRoleId(
      body.roleId,
      body.permissionIds,
    );
  }

  // ===================== 角色 ↔ 接口权限 =====================

  @Get('api-permissions')
  @ApiPermission({
    code: 'system:role:api-permission:list',
    name: '查询角色接口权限',
    module: '角色管理',
  })
  @ApiOperation({
    summary: 'List API permissions of a role',
    description: '查询某个角色绑定的接口权限',
  })
  listApiPermissionsByRoleId(@Query('roleId', ParseIntPipe) roleId: number) {
    return this.roleService.listApiPermissionsByRoleId(roleId);
  }

  @Post('setApiPermissions')
  @ApiPermission({
    code: 'system:role:api-permission:update',
    name: '设置角色接口权限',
    module: '角色管理',
  })
  @ApiOperation({
    summary: 'Set API permissions of a role',
    description: '全量覆盖角色的接口权限列表',
  })
  @ApiBody({
    schema: generateSchema(setRoleApiPermissionsSchema, false, '3.0') as any,
  })
  @UsePipes(new ZodValidationPipe(setRoleApiPermissionsSchema))
  setApiPermissionsByRoleId(@Body() body: SetRoleApiPermissionsDto) {
    return this.roleService.setApiPermissionsByRoleId(
      body.roleId,
      body.apiPermissionIds,
    );
  }

  // ===================== 角色 ↔ 用户 =====================

  @Get('users')
  @ApiPermission({
    code: 'system:role:user:list',
    name: '查询角色用户',
    module: '角色管理',
  })
  @ApiOperation({
    summary: 'List users of a role',
    description: '查询某个角色下的用户',
  })
  listUsersByRoleId(@Query('roleId', ParseIntPipe) roleId: number) {
    return this.roleService.listUsersByRoleId(roleId);
  }

  @Post('assignUsers')
  @ApiPermission({
    code: 'system:role:user:assign',
    name: '分配角色用户',
    module: '角色管理',
  })
  @ApiOperation({
    summary: 'Assign role to users',
    description: '批量给一组用户加上角色',
  })
  @ApiBody({
    schema: generateSchema(assignRoleUsersSchema, false, '3.0') as any,
  })
  @UsePipes(new ZodValidationPipe(assignRoleUsersSchema))
  assignToUsers(@Body() body: AssignRoleUsersDto) {
    return this.roleService.assignToUsers(body.roleId, body.userIds);
  }

  @Post('revokeUsers')
  @ApiPermission({
    code: 'system:role:user:revoke',
    name: '撤销角色用户',
    module: '角色管理',
  })
  @ApiOperation({
    summary: 'Revoke role from users',
    description: '批量从一组用户身上撤销角色',
  })
  @ApiBody({
    schema: generateSchema(assignRoleUsersSchema, false, '3.0') as any,
  })
  @UsePipes(new ZodValidationPipe(assignRoleUsersSchema))
  revokeFromUsers(@Body() body: AssignRoleUsersDto) {
    return this.roleService.revokeFromUsers(body.roleId, body.userIds);
  }
}
