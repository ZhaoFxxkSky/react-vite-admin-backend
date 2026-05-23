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
import { ConfigService } from './config.service';
import {
  createConfigSchema,
  updateConfigSchema,
  CreateConfigDto,
  UpdateConfigDto,
} from './dto';
import {
  PermissionsGuard,
  ApiPermission,
  JwtGuard,
  ZodValidationPipe,
} from '@core';
import { removeByIdSchema, RemoveByIdDto } from '@shared';

@ApiTags('Configs')
@ApiBearerAuth()
@Controller('configs')
@UseGuards(JwtGuard, PermissionsGuard)
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get('list')
  @ApiPermission({
    code: 'system:config:list',
    module: '参数配置',
    name: '查询配置列表',
  })
  @ApiOperation({
    summary: 'List all configs',
    description: '查询所有参数配置',
  })
  listAll() {
    return this.configService.listAll();
  }

  @Get('listByGroup')
  @ApiPermission({
    code: 'system:config:listByGroup',
    module: '参数配置',
    name: '按分组查询配置',
  })
  @ApiOperation({
    summary: 'List configs by group',
    description: '按分组查询参数配置',
  })
  listByGroup(@Query('group') group: string) {
    return this.configService.listByGroup(group);
  }

  @Get('detail')
  @ApiPermission({
    code: 'system:config:detail',
    module: '参数配置',
    name: '查询配置详情',
  })
  @ApiOperation({
    summary: 'Get config by id',
    description: '根据 id 查询配置详情',
  })
  getById(@Query('id', ParseIntPipe) id: number) {
    return this.configService.getById(id);
  }

  @Get('getValue')
  @ApiPermission({
    code: 'system:config:getValue',
    module: '参数配置',
    name: '获取配置值',
  })
  @ApiOperation({
    summary: 'Get config value by key',
    description: '根据 key 获取配置值',
  })
  async getValue(
    @Query('key') key: string,
    @Query('defaultValue') defaultValue?: string,
  ) {
    const value = await this.configService.getValue(key, defaultValue);
    return { key, value };
  }

  @Post('create')
  @ApiPermission({
    code: 'system:config:create',
    module: '参数配置',
    name: '创建配置',
  })
  @ApiOperation({ summary: 'Create config', description: '创建参数配置' })
  @ApiBody({
    schema: generateSchema(createConfigSchema, false, '3.0') as any,
  })
  @UsePipes(new ZodValidationPipe(createConfigSchema))
  save(@Body() dto: CreateConfigDto) {
    return this.configService.save(dto);
  }

  @Post('update')
  @ApiPermission({
    code: 'system:config:update',
    module: '参数配置',
    name: '更新配置',
  })
  @ApiOperation({ summary: 'Update config', description: '更新参数配置' })
  @ApiBody({
    schema: generateSchema(updateConfigSchema, false, '3.0') as any,
  })
  @UsePipes(new ZodValidationPipe(updateConfigSchema))
  updateById(@Body() body: UpdateConfigDto) {
    const { id, ...patch } = body;
    return this.configService.updateById(id, patch as UpdateConfigDto);
  }

  @Post('delete')
  @ApiPermission({
    code: 'system:config:delete',
    module: '参数配置',
    name: '删除配置',
  })
  @ApiOperation({
    summary: 'Delete config',
    description: '删除参数配置(内置配置不可删除)',
  })
  @ApiBody({ schema: generateSchema(removeByIdSchema, false, '3.0') as any })
  @UsePipes(new ZodValidationPipe(removeByIdSchema))
  removeById(@Body() dto: RemoveByIdDto) {
    return this.configService.removeById(dto.id);
  }

  @Post('refreshCache')
  @ApiPermission({
    code: 'system:config:refreshCache',
    module: '参数配置',
    name: '刷新缓存',
  })
  @ApiOperation({
    summary: 'Refresh config cache',
    description: '刷新所有参数配置缓存',
  })
  refreshCache() {
    return this.configService.refreshCache();
  }
}
