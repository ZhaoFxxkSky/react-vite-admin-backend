import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '@core';
import { CaptchaService } from './captcha.service';

@ApiTags('Captcha')
@Controller('captcha')
export class CaptchaController {
  constructor(private readonly captchaService: CaptchaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '获取验证码', description: '生成图形验证码' })
  async getCaptcha(@Query('type') type: 'math' | 'text' = 'text') {
    return this.captchaService.generate(type);
  }
}
