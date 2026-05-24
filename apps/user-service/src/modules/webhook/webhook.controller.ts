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
import { WebhookService } from './webhook.service';
import {
  CreateWebhookDto,
  createWebhookSchema,
  ListWebhookDto,
  listWebhookSchema,
} from './dto';

@ApiTags('Webhook 管理')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createWebhookSchema))
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWebhookDto,
  ) {
    return this.webhookService.create(user.id, dto);
  }

  @Get()
  @UsePipes(new ZodValidationPipe(listWebhookSchema))
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() dto: ListWebhookDto,
  ) {
    return this.webhookService.list(user.id, dto);
  }

  @Delete(':id')
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.webhookService.delete(user.id, Number(id));
  }

  @Put(':id/status')
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.webhookService.updateStatus(user.id, Number(id), status);
  }

  @Post('test')
  async testWebhook(
    @Body('url') _url: string,
    @Body('secret') _secret: string,
  ) {
    // TODO(v2): 实现测试推送（发送测试事件到指定 webhook URL）
    return { message: 'Test webhook sent' };
  }
}
