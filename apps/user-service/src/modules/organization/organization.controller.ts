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
import { OrganizationService } from './organization.service';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  CreateOrganizationDto,
  UpdateOrganizationDto,
} from './dto';
import {
  PermissionsGuard,
  ApiPermission,
  JwtGuard,
  ZodValidationPipe,
} from '@core';
import { removeByIdSchema, RemoveByIdDto } from '@shared';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
@UseGuards(JwtGuard, PermissionsGuard)
export class OrganizationController {
  constructor(private readonly orgService: OrganizationService) {}

  @Get('listTree')
  @ApiPermission({
    code: 'system:organization:list',
    module: '组织管理',
    name: '查询组织树',
  })
  @ApiOperation({
    summary: 'List organization tree',
    description: '查询组织树',
  })
  listTree() {
    return this.orgService.listTree();
  }

  @Get('detail')
  @ApiPermission({
    code: 'system:organization:detail',
    name: '查询组织详情',
    module: '组织管理',
  })
  @ApiOperation({
    summary: 'Get organization by id',
    description: '根据 id 查询组织',
  })
  getById(@Query('id', ParseIntPipe) id: number) {
    return this.orgService.getById(id);
  }

  @Post('create')
  @ApiPermission({
    code: 'system:organization:create',
    name: '创建组织',
    module: '组织管理',
  })
  @ApiOperation({ summary: 'Create organization', description: '创建组织' })
  @ApiBody({
    schema: generateSchema(createOrganizationSchema, false, '3.0') as any,
  })
  @UsePipes(new ZodValidationPipe(createOrganizationSchema))
  save(@Body() dto: CreateOrganizationDto) {
    return this.orgService.save(dto);
  }

  @Post('update')
  @ApiPermission({
    code: 'system:organization:update',
    name: '更新组织',
    module: '组织管理',
  })
  @ApiOperation({ summary: 'Update organization', description: '更新组织' })
  @ApiBody({
    schema: generateSchema(updateOrganizationSchema, false, '3.0') as any,
  })
  @UsePipes(new ZodValidationPipe(updateOrganizationSchema))
  updateById(@Body() body: UpdateOrganizationDto) {
    const { id, ...patch } = body;
    return this.orgService.updateById(id, patch as UpdateOrganizationDto);
  }

  @Post('delete')
  @ApiPermission({
    code: 'system:organization:delete',
    name: '删除组织',
    module: '组织管理',
  })
  @ApiOperation({
    summary: 'Delete organization',
    description: '删除组织(存在子组织或成员时会被拒绝)',
  })
  @ApiBody({ schema: generateSchema(removeByIdSchema, false, '3.0') as any })
  @UsePipes(new ZodValidationPipe(removeByIdSchema))
  removeById(@Body() dto: RemoveByIdDto) {
    return this.orgService.removeById(dto.id);
  }

  @Get('members')
  @ApiPermission({
    code: 'system:organization:members',
    name: '查询组织成员',
    module: '组织管理',
  })
  @ApiOperation({
    summary: 'List members of an organization',
    description: '查询组织下成员(主组织 ∪ 关联组织)',
  })
  listMembersByOrgId(@Query('orgId', ParseIntPipe) orgId: number) {
    return this.orgService.listMembersByOrgId(orgId);
  }
}
