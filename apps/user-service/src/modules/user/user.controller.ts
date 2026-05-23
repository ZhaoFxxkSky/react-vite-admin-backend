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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { generateSchema } from '@anatine/zod-openapi';
import { UserService } from './user.service';
import {
  createUserSchema,
  updateUserSchema,
  updateUserByIdSchema,
  changePasswordSchema,
  resetPasswordByIdSchema,
  changeUserStatusSchema,
  setUserRolesSchema,
  listUserByPageSchema,
  CreateUserDto,
  UpdateUserDto,
  UpdateUserByIdDto,
  ChangePasswordDto,
  ResetPasswordByIdDto,
  ChangeUserStatusDto,
  SetUserRolesDto,
  ListUserByPageDto,
} from './dto';
import {
  ZodValidationPipe,
  PermissionsGuard,
  ApiPermission,
  JwtGuard,
  CurrentUser,
} from '@core';
import { AuthenticatedUser, removeByIdSchema, RemoveByIdDto } from '@shared';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtGuard, PermissionsGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ===================== Excel 导入导出 =====================

  @Get('export')
  @ApiPermission({
    code: 'system:user:export',
    name: '导出用户',
    module: '用户管理',
  })
  @ApiOperation({ summary: '导出用户列表到 Excel' })
  async exportUsers(@Query() query: any) {
    return this.userService.exportUsers(query);
  }

  @Post('import')
  @ApiPermission({
    code: 'system:user:import',
    name: '导入用户',
    module: '用户管理',
  })
  @ApiOperation({ summary: '从 Excel 批量导入用户' })
  async importUsers(@Body() data: any[]) {
    return this.userService.importUsers(data);
  }

  @Get('import-template')
  @ApiOperation({ summary: '下载用户导入模板' })
  async downloadTemplate() {
    return this.userService.generateImportTemplate();
  }

  // ===================== 管理员接口 =====================

  @Post('listByPage')
  @ApiPermission({
    code: 'system:user:list',
    name: '分页查询用户',
    module: '用户管理',
  })
  @ApiOperation({ summary: 'Page users', description: '分页查询用户' })
  @ApiBody({
    schema: generateSchema(listUserByPageSchema) as any,
  })
  @UsePipes(new ZodValidationPipe(listUserByPageSchema))
  listByPage(@Body() dto: ListUserByPageDto) {
    return this.userService.listByPage(dto);
  }

  @Get('detail')
  @ApiPermission({
    code: 'system:user:detail',
    name: '查询用户详情',
    module: '用户管理',
  })
  @ApiOperation({ summary: 'Get user by id', description: '查询单个用户详情' })
  getById(@Query('id', ParseIntPipe) id: number) {
    return this.userService.getById(id);
  }

  @Post('create')
  @ApiPermission({
    code: 'system:user:create',
    name: '创建用户',
    module: '用户管理',
  })
  @ApiOperation({ summary: 'Create user', description: '新建用户' })
  @ApiBody({ schema: generateSchema(createUserSchema, false, '3.0') as any })
  @UsePipes(new ZodValidationPipe(createUserSchema))
  save(@CurrentUser() current: AuthenticatedUser, @Body() dto: CreateUserDto) {
    return this.userService.save(dto, current.isSuperAdmin);
  }

  @Post('update')
  @ApiPermission({
    code: 'system:user:update',
    name: '更新用户',
    module: '用户管理',
  })
  @ApiOperation({ summary: 'Update user', description: '更新用户' })
  @ApiBody({
    schema: generateSchema(updateUserByIdSchema) as any,
  })
  @UsePipes(new ZodValidationPipe(updateUserByIdSchema))
  updateById(
    @CurrentUser() current: AuthenticatedUser,
    @Body() body: UpdateUserByIdDto,
  ) {
    const { id, ...patch } = body;
    return this.userService.updateById(
      id,
      patch as UpdateUserByIdDto,
      current.isSuperAdmin,
    );
  }

  @Post('delete')
  @ApiPermission({
    code: 'system:user:delete',
    name: '删除用户',
    module: '用户管理',
  })
  @ApiOperation({ summary: 'Delete user', description: '删除用户' })
  @ApiBody({ schema: generateSchema(removeByIdSchema, false, '3.0') as any })
  @UsePipes(new ZodValidationPipe(removeByIdSchema))
  removeById(@Body() dto: RemoveByIdDto) {
    return this.userService.removeById(dto.id);
  }

  @Post('resetPassword')
  @ApiPermission({
    code: 'system:user:reset-password',
    name: '重置用户密码',
    module: '用户管理',
  })
  @ApiOperation({
    summary: 'Reset password by id',
    description: '管理员重置用户密码',
  })
  @ApiBody({
    schema: generateSchema(resetPasswordByIdSchema) as any,
  })
  @UsePipes(new ZodValidationPipe(resetPasswordByIdSchema))
  resetPasswordById(@Body() body: ResetPasswordByIdDto) {
    return this.userService.resetPasswordById(body.id, body.newPassword);
  }

  @Post('changeStatus')
  @ApiPermission({
    code: 'system:user:change-status',
    name: '修改用户状态',
    module: '用户管理',
  })
  @ApiOperation({
    summary: 'Change user status',
    description: '修改用户状态(启用/禁用/封禁/锁定)',
  })
  @ApiBody({
    schema: generateSchema(changeUserStatusSchema) as any,
  })
  @UsePipes(new ZodValidationPipe(changeUserStatusSchema))
  changeStatusById(@Body() body: ChangeUserStatusDto) {
    return this.userService.changeStatusById(body.id, body.status);
  }

  @Post('unlock')
  @ApiPermission({
    code: 'system:user:unlock',
    name: '解锁用户',
    module: '用户管理',
  })
  @ApiOperation({
    summary: 'Unlock user',
    description: '解锁用户(状态置为 active 并清零失败计数)',
  })
  @ApiBody({ schema: generateSchema(removeByIdSchema, false, '3.0') as any })
  @UsePipes(new ZodValidationPipe(removeByIdSchema))
  unlockById(@Body() dto: RemoveByIdDto) {
    return this.userService.unlockById(dto.id);
  }

  // ===================== 用户 ↔ 角色 =====================

  @Post('setRoles')
  @ApiPermission({
    code: 'system:user:set-roles',
    name: '设置用户角色',
    module: '用户管理',
  })
  @ApiOperation({
    summary: 'Set roles for a user',
    description: '设置用户角色(全量覆盖)',
  })
  @ApiBody({ schema: generateSchema(setUserRolesSchema, false, '3.0') as any })
  @UsePipes(new ZodValidationPipe(setUserRolesSchema))
  setRolesByUserId(@Body() body: SetUserRolesDto) {
    return this.userService.setRolesByUserId(body.userId, body.roleIds);
  }

  @Get('roles')
  @ApiPermission({
    code: 'system:user:role-list',
    name: '查询用户角色',
    module: '用户管理',
  })
  @ApiOperation({
    summary: 'List roles of a user',
    description: '查询用户已绑定的角色',
  })
  listRolesByUserId(@Query('userId', ParseIntPipe) userId: number) {
    return this.userService.listRolesByUserId(userId);
  }

  // ===================== 个人中心 =====================

  @Get('me')
  @ApiOperation({
    summary: 'Get me',
    description: '获取当前用户信息(含主组织、关联组织、角色)',
  })
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.userService.getMe(user.id);
  }

  @Post('updateMe')
  @ApiOperation({
    summary: 'Update me',
    description: '更新当前用户的个人资料',
  })
  @ApiBody({ schema: generateSchema(updateUserSchema, false, '3.0') as any })
  @UsePipes(new ZodValidationPipe(updateUserSchema))
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateUserDto) {
    return this.userService.updateMe(user.id, dto);
  }

  @Post('changePassword')
  @ApiOperation({
    summary: 'Change password',
    description: '修改当前用户密码',
  })
  @ApiBody({
    schema: generateSchema(changePasswordSchema, false, '3.0') as any,
  })
  @UsePipes(new ZodValidationPipe(changePasswordSchema))
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ChangePasswordDto,
  ) {
    return this.userService.changePassword(
      user.id,
      body.oldPassword,
      body.newPassword,
    );
  }
}
