import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, UsePipes, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe, JwtAuthGuard, CurrentUser, AuthenticatedUser } from '@app/user-platform';
import { ApiKeyService } from './api-key.service';
import { CreateApiKeyDto, createApiKeySchema, ListApiKeyDto, listApiKeySchema } from './dto';

@ApiTags('API Key 管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api-keys')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createApiKeySchema))
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateApiKeyDto) {
    return this.apiKeyService.create(user.id, dto);
  }

  @Get()
  @UsePipes(new ZodValidationPipe(listApiKeySchema))
  async list(@CurrentUser() user: AuthenticatedUser, @Query() dto: ListApiKeyDto) {
    return this.apiKeyService.list(user.id, dto);
  }

  @Delete(':id')
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.apiKeyService.delete(user.id, Number(id));
  }

  @Put(':id/status')
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.apiKeyService.updateStatus(user.id, Number(id), status);
  }
}
