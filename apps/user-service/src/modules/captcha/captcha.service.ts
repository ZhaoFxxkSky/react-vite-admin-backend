import { Injectable } from '@nestjs/common';
import * as svgCaptcha from 'svg-captcha';
import { RedisService } from '@core';
import { randomBytes } from 'crypto';

@Injectable()
export class CaptchaService {
  private readonly CAPTCHA_PREFIX = 'captcha:';
  private readonly CAPTCHA_EXPIRY = 300; // 5分钟

  constructor(private readonly redisService: RedisService) {}

  async generate(type: 'math' | 'text' = 'text') {
    let captcha;
    if (type === 'math') {
      captcha = svgCaptcha.createMathExpr({
        size: 4,
        noise: 2,
        color: true,
        background: '#f0f0f0',
        width: 120,
        height: 40,
      });
    } else {
      captcha = svgCaptcha.create({
        size: 4,
        noise: 3,
        color: true,
        background: '#f0f0f0',
        width: 120,
        height: 40,
      });
    }

    const key = `captcha:${Date.now()}:${randomBytes(4).toString('hex')}`;
    await this.redisService.set(
      `${this.CAPTCHA_PREFIX}${key}`,
      captcha.text.toLowerCase(),
      this.CAPTCHA_EXPIRY,
    );

    return { key, svg: captcha.data };
  }

  async verify(key: string, code: string): Promise<boolean> {
    if (!key || !code) return false;
    const storedCode = await this.redisService.get(
      `${this.CAPTCHA_PREFIX}${key}`,
    );
    if (!storedCode) return false;
    await this.redisService.del(`${this.CAPTCHA_PREFIX}${key}`);
    return storedCode === code.toLowerCase();
  }
}
