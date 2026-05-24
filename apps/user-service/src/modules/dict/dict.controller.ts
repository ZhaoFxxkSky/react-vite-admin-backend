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
import { DictService } from './dict.service';
import {
  createDictTypeSchema,
  updateDictTypeSchema,
  createDictDataSchema,
  updateDictDataSchema,
  CreateDictTypeDto,
  UpdateDictTypeDto,
  CreateDictDataDto,
  UpdateDictDataDto,
} from './dto';
import {
  PermissionsGuard,
  ApiPermission,
  JwtGuard,
  ZodValidationPipe,
  Public,
} from '@core';
import { removeByIdSchema, RemoveByIdDto } from '@shared';

@ApiTags('Dicts')
@ApiBearerAuth()
@Controller('dicts')
@UseGuards(JwtGuard, PermissionsGuard)
export class DictController {
  constructor(private readonly dictService: DictService) {}

  // ===================== 字典类型 =====================

  @Get('types')
  @ApiOperation({
    summary: 'List dict types',
    description: '查询全部字典类型(不分页)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: '字典类型状态',
  })
  listTypes(@Query('status') status?: string) {
    return this.dictService.listTypes({ status });
  }

  @Get('type/detail')
  @ApiPermission({
    code: 'system:dict:type:detail',
    name: '查询字典类型详情',
    module: '数据字典',
  })
  @ApiOperation({
    summary: 'Get dict type by id',
    description: '根据 id 查询字典类型',
  })
  getTypeById(@Query('id', ParseIntPipe) id: number) {
    return this.dictService.getTypeById(id);
  }

  @Post('type/create')
  @ApiPermission({
    code: 'system:dict:type:create',
    name: '创建字典类型',
    module: '数据字典',
  })
  @ApiOperation({ summary: 'Create dict type', description: '创建字典类型' })
  @ApiBody({
    schema: generateSchema(createDictTypeSchema, false, '3.0') as any,
  })
  @UsePipes(new ZodValidationPipe(createDictTypeSchema))
  saveType(@Body() dto: CreateDictTypeDto) {
    return this.dictService.saveType(dto);
  }

  @Post('type/update')
  @ApiPermission({
    code: 'system:dict:type:update',
    name: '更新字典类型',
    module: '数据字典',
  })
  @ApiOperation({ summary: 'Update dict type', description: '更新字典类型' })
  @ApiBody({
    schema: generateSchema(updateDictTypeSchema, false, '3.0') as any,
  })
  @UsePipes(new ZodValidationPipe(updateDictTypeSchema))
  updateTypeById(@Body() body: UpdateDictTypeDto) {
    const { id, ...patch } = body;
    return this.dictService.updateTypeById(id, patch as UpdateDictTypeDto);
  }

  @Post('type/delete')
  @ApiPermission({
    code: 'system:dict:type:delete',
    name: '删除字典类型',
    module: '数据字典',
  })
  @ApiOperation({
    summary: 'Delete dict type',
    description: '删除字典类型(存在数据项时会被拒绝)',
  })
  @ApiBody({ schema: generateSchema(removeByIdSchema, false, '3.0') as any })
  @UsePipes(new ZodValidationPipe(removeByIdSchema))
  removeTypeById(@Body() dto: RemoveByIdDto) {
    return this.dictService.removeTypeById(dto.id);
  }

  // ===================== 字典数据 =====================

  @Get('data')
  @ApiOperation({
    summary: 'List dict data',
    description: '查询字典数据列表',
  })
  @ApiQuery({
    name: 'dictId',
    required: false,
    type: Number,
    description: '字典类型 id',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: '字典数据状态',
  })
  listData(@Query('dictId') dictId?: string, @Query('status') status?: string) {
    return this.dictService.listData({
      dictId: dictId ? Number(dictId) : undefined,
      status,
    });
  }

  @Get('data/detail')
  @ApiPermission({
    code: 'system:dict:data:detail',
    name: '查询字典数据详情',
    module: '数据字典',
  })
  @ApiOperation({
    summary: 'Get dict data by id',
    description: '根据 id 查询字典数据',
  })
  getDataById(@Query('id', ParseIntPipe) id: number) {
    return this.dictService.getDataById(id);
  }

  @Post('data/create')
  @ApiPermission({
    code: 'system:dict:data:create',
    name: '创建字典数据',
    module: '数据字典',
  })
  @ApiOperation({ summary: 'Create dict data', description: '创建字典数据' })
  @ApiBody({
    schema: generateSchema(createDictDataSchema, false, '3.0') as any,
  })
  @UsePipes(new ZodValidationPipe(createDictDataSchema))
  saveData(@Body() dto: CreateDictDataDto) {
    return this.dictService.saveData(dto);
  }

  @Post('data/update')
  @ApiPermission({
    code: 'system:dict:data:update',
    name: '更新字典数据',
    module: '数据字典',
  })
  @ApiOperation({ summary: 'Update dict data', description: '更新字典数据' })
  @ApiBody({
    schema: generateSchema(updateDictDataSchema, false, '3.0') as any,
  })
  @UsePipes(new ZodValidationPipe(updateDictDataSchema))
  updateDataById(@Body() body: UpdateDictDataDto) {
    const { id, ...patch } = body;
    return this.dictService.updateDataById(id, patch as UpdateDictDataDto);
  }

  @Post('data/delete')
  @ApiPermission({
    code: 'system:dict:data:delete',
    name: '删除字典数据',
    module: '数据字典',
  })
  @ApiOperation({ summary: 'Delete dict data', description: '删除字典数据' })
  @ApiBody({ schema: generateSchema(removeByIdSchema, false, '3.0') as any })
  @UsePipes(new ZodValidationPipe(removeByIdSchema))
  removeDataById(@Body() dto: RemoveByIdDto) {
    return this.dictService.removeDataById(dto.id);
  }

  // ===================== 公共查询 =====================

  @Get('byCode')
  @Public()
  @ApiOperation({
    summary: 'Get dict by code',
    description: '根据字典类型编码查询字典数据(无需认证)',
  })
  @ApiQuery({
    name: 'code',
    required: true,
    type: String,
    description: '字典类型编码',
  })
  getDictByCode(@Query('code') code: string) {
    return this.dictService.getDictByCode(code);
  }
}
