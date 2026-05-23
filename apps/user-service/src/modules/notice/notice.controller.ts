import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe, JwtAuthGuard, CurrentUser, AuthenticatedUser } from '@app/user-platform';
import { NoticeService } from './notice.service';
import { CreateNoticeDto, createNoticeSchema, ListNoticeDto, listNoticeSchema } from './dto';

@ApiTags('公告管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/notices')
export class NoticeAdminController {
  constructor(private readonly noticeService: NoticeService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createNoticeSchema))
  async create(@Body() dto: CreateNoticeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.noticeService.create(dto, user.id);
  }

  @Get()
  @UsePipes(new ZodValidationPipe(listNoticeSchema))
  async list(@Body() dto: ListNoticeDto) {
    return this.noticeService.list(dto);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.noticeService.getById(Number(id));
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateNoticeDto>) {
    return this.noticeService.update(Number(id), dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.noticeService.delete(Number(id));
  }
}

@ApiTags('公告')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notices')
export class NoticeController {
  constructor(private readonly noticeService: NoticeService) {}

  @Get()
  async getActiveNotices() {
    return this.noticeService.getActiveNotices();
  }
}
