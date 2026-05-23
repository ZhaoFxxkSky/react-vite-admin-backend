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
import { PostService } from './post.service';
import {
  createPostSchema,
  updatePostSchema,
  CreatePostDto,
  UpdatePostDto,
} from './dto';
import {
  PermissionsGuard,
  ApiPermission,
  JwtGuard,
  ZodValidationPipe,
} from '@core';
import { removeByIdSchema, RemoveByIdDto } from '@shared';

@ApiTags('Posts')
@ApiBearerAuth()
@Controller('posts')
@UseGuards(JwtGuard, PermissionsGuard)
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Get('list')
  @ApiOperation({
    summary: 'List posts',
    description: '查询全部岗位(不分页)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: '岗位状态',
  })
  list(@Query('status') status?: string) {
    return this.postService.list({ status });
  }

  @Get('detail')
  @ApiPermission({
    code: 'system:post:detail',
    name: '查询岗位详情',
    module: '岗位管理',
  })
  @ApiOperation({
    summary: 'Get post by id',
    description: '根据 id 查询岗位',
  })
  getById(@Query('id', ParseIntPipe) id: number) {
    return this.postService.getById(id);
  }

  @Post('create')
  @ApiPermission({
    code: 'system:post:create',
    name: '创建岗位',
    module: '岗位管理',
  })
  @ApiOperation({ summary: 'Create post', description: '创建岗位' })
  @ApiBody({
    schema: generateSchema(createPostSchema, false, '3.0') as any,
  })
  @UsePipes(new ZodValidationPipe(createPostSchema))
  save(@Body() dto: CreatePostDto) {
    return this.postService.save(dto);
  }

  @Post('update')
  @ApiPermission({
    code: 'system:post:update',
    name: '更新岗位',
    module: '岗位管理',
  })
  @ApiOperation({ summary: 'Update post', description: '更新岗位' })
  @ApiBody({
    schema: generateSchema(updatePostSchema, false, '3.0') as any,
  })
  @UsePipes(new ZodValidationPipe(updatePostSchema))
  updateById(@Body() body: UpdatePostDto) {
    const { id, ...patch } = body;
    return this.postService.updateById(id, patch as UpdatePostDto);
  }

  @Post('delete')
  @ApiPermission({
    code: 'system:post:delete',
    name: '删除岗位',
    module: '岗位管理',
  })
  @ApiOperation({
    summary: 'Delete post',
    description: '删除岗位(存在成员时会被拒绝)',
  })
  @ApiBody({ schema: generateSchema(removeByIdSchema, false, '3.0') as any })
  @UsePipes(new ZodValidationPipe(removeByIdSchema))
  removeById(@Body() dto: RemoveByIdDto) {
    return this.postService.removeById(dto.id);
  }

  @Post('assignToUser')
  @ApiPermission({
    code: 'system:post:user:assign',
    name: '分配岗位给用户',
    module: '岗位管理',
  })
  @ApiOperation({
    summary: 'Assign posts to user',
    description: '给用户分配岗位(全量覆盖)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'integer', description: '用户 id' },
        postIds: {
          type: 'array',
          items: { type: 'integer' },
          description: '岗位 id 列表',
        },
      },
    } as any,
  })
  assignToUser(
    @Body('userId', ParseIntPipe) userId: number,
    @Body('postIds') postIds: number[],
  ) {
    return this.postService.assignToUser(userId, postIds);
  }
}
