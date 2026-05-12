import {
  Controller,
  Post,
  Body,
  UsePipes,
  UseGuards,
  Get,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { generateSchema } from '@anatine/zod-openapi';
import { AuthService } from './auth.service';
import {
  loginSchema,
  loginByEmailSchema,
  loginByPhoneSchema,
  registerSchema,
  refreshTokenSchema,
  RegisterDto,
  LoginDto,
  LoginByEmailDto,
  LoginByPhoneDto,
  RefreshTokenDto,
} from './dto';
import {
  ZodValidationPipe,
  Public,
  JwtGuard,
  CurrentUser,
  RedisService,
} from '@core';
import { AuthenticatedUser } from '@shared';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly redisService: RedisService,
  ) {}

  private readonly RATE_LIMIT_WINDOW = 60; // seconds
  private readonly RATE_LIMIT_MAX = 10;

  private async checkRateLimit(key: string) {
    const redis = this.redisService.getClient();
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, this.RATE_LIMIT_WINDOW);
    }
    if (current > this.RATE_LIMIT_MAX) {
      throw new HttpException(
        'Too many requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register', description: '公开注册' })
  @ApiBody({ schema: generateSchema(registerSchema, false, '3.0') as any })
  @UsePipes(new ZodValidationPipe(registerSchema))
  async register(@Req() req: any, @Body() dto: RegisterDto) {
    const ip = req.ip || 'unknown';
    await this.checkRateLimit(`rate_limit:auth:register:${ip}`);
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login', description: '用户名密码登录' })
  @ApiBody({ schema: generateSchema(loginSchema, false, '3.0') as any })
  @UsePipes(new ZodValidationPipe(loginSchema))
  async login(@Req() req: any, @Body() dto: LoginDto) {
    const ip = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || '';
    await this.checkRateLimit(`rate_limit:auth:login:${ip}`);
    return this.authService.login(dto, ip, userAgent);
  }

  @Public()
  @Post('loginByEmail')
  @ApiOperation({ summary: 'Login by email', description: '邮箱密码登录' })
  @ApiBody({ schema: generateSchema(loginByEmailSchema, false, '3.0') as any })
  @UsePipes(new ZodValidationPipe(loginByEmailSchema))
  async loginByEmail(@Req() req: any, @Body() dto: LoginByEmailDto) {
    const ip = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || '';
    await this.checkRateLimit(`rate_limit:auth:login:${ip}`);
    return this.authService.loginByEmail(dto, ip, userAgent);
  }

  @Public()
  @Post('loginByPhone')
  @ApiOperation({ summary: 'Login by phone', description: '手机号密码登录' })
  @ApiBody({ schema: generateSchema(loginByPhoneSchema, false, '3.0') as any })
  @UsePipes(new ZodValidationPipe(loginByPhoneSchema))
  async loginByPhone(@Req() req: any, @Body() dto: LoginByPhoneDto) {
    const ip = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || '';
    await this.checkRateLimit(`rate_limit:auth:login:${ip}`);
    return this.authService.loginByPhone(dto, ip, userAgent);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh token', description: '刷新访问令牌' })
  @ApiBody({ schema: generateSchema(refreshTokenSchema, false, '3.0') as any })
  @UsePipes(new ZodValidationPipe(refreshTokenSchema))
  refresh(@Req() req: any, @Body() dto: RefreshTokenDto) {
    const ip = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || '';
    return this.authService.refresh(dto.refreshToken, ip, userAgent);
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: 'Logout', description: '登出并撤销刷新令牌' })
  @ApiBody({ schema: generateSchema(refreshTokenSchema, false, '3.0') as any })
  @UsePipes(new ZodValidationPipe(refreshTokenSchema))
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Get('getUserInfoByToken')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user info by token',
    description: '获取当前用户信息(含组织、角色、权限码)',
  })
  getUserInfoByToken(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getUserInfoByToken(user);
  }
}
