import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UsePipes,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe, CurrentUser } from '@core';
import { JwtGuard } from '@app/user-platform';
import { AuthenticatedUser } from '@shared';
import { NoticeService } from './notice.service';
import {
  CreateNoticeDto,
  createNoticeSchema,
  ListNoticeDto,
  listNoticeSchema,
} from './dto';

@ApiTags('公告管理')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('admin/notices')
export class NoticeAdminController {
  constructor(private readonly noticeService: NoticeService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createNoticeSchema))
  async create(
    @Body() dto: CreateNoticeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.noticeService.create(dto, user.id);
  }

  @Get()
  @UsePipes(new ZodValidationPipe(listNoticeSchema))
  async list(@Query() dto: ListNoticeDto) {
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
@UseGuards(JwtGuard)
@Controller('notices')
export class NoticeController {
  constructor(private readonly noticeService: NoticeService) {}

  @Get()
  async getActiveNotices(@CurrentUser() user: AuthenticatedUser) {
    // 简化处理：直接传入空角色列表，或从 user 中获取
    return this.noticeService.getActiveNotices(user.id, []);
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
    return { count: await this.noticeService.getUnreadCount(user.id, []) };
  }

  @Get('popup')
  async getPopupNotices(@CurrentUser() user: AuthenticatedUser) {
    return this.noticeService.getPopupNotices(user.id, []);
  }

  @Post(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.noticeService.markAsRead(Number(id), user.id);
  }

  @Post('read-all')
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    return this.noticeService.markAllAsRead(user.id);
  }
}
