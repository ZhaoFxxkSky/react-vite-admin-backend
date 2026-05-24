import { Controller, Get, Put, Body, UseGuards, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '@app/user-platform';
import { Public } from '@core';
import { SettingsService } from './settings.service';

@ApiTags('系统设置')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('email')
  async getEmailConfig() {
    return this.settingsService.getEmailConfig();
  }

  @Put('email')
  async setEmailConfig(@Body() config: any) {
    return this.settingsService.setEmailConfig(config);
  }

  @Get('sms')
  async getSmsConfig() {
    return this.settingsService.getSmsConfig();
  }

  @Put('sms')
  async setSmsConfig(@Body() config: any) {
    return this.settingsService.setSmsConfig(config);
  }

  @Get('security')
  async getSecurityConfig() {
    return this.settingsService.getSecurityConfig();
  }

  @Put('security')
  async setSecurityConfig(@Body() config: any) {
    return this.settingsService.setSecurityConfig(config);
  }

  // ===================== 品牌配置（公开接口�?====================

  @Public()
  @Get('brand')
  @ApiTags('品牌配置')
  async getBrandConfig() {
    return this.settingsService.getBrandConfig();
  }

  @Put('brand')
  @ApiTags('品牌配置')
  async setBrandConfig(@Body() config: any) {
    return this.settingsService.setBrandConfig(config);
  }
}
