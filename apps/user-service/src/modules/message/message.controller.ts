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
import { MessageService } from './message.service';
import {
  SendMessageDto,
  sendMessageSchema,
  ListMessageDto,
  listMessageSchema,
} from './dto';

@ApiTags('消息中心')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post('send')
  @UsePipes(new ZodValidationPipe(sendMessageSchema))
  async send(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendMessageDto,
  ) {
    return this.messageService.send(user.id, dto);
  }

  @Get()
  @UsePipes(new ZodValidationPipe(listMessageSchema))
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() dto: ListMessageDto,
  ) {
    return this.messageService.list(user.id, dto);
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
    return { count: await this.messageService.getUnreadCount(user.id) };
  }

  @Put(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.messageService.markAsRead(Number(id), user.id);
  }

  @Put('read-all')
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    return this.messageService.markAllAsRead(user.id);
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.messageService.delete(Number(id), user.id);
  }
}
