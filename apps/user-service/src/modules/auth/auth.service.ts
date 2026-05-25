import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AppLogger, LogMethod, RedisService, PrismaService } from '@core';
import {
  hashPassword,
  comparePassword,
  REFRESH_TOKEN_PREFIX,
  UserStatus,
  AuthenticatedUser,
} from '@shared';
import { v4 as uuidv4 } from 'uuid';
import { randomInt } from 'crypto';
import { UserEntity } from '../user/domain/entities/user.entity';
import { UserRepository } from '../user/infrastructure/repositories/user.repository';
import { UserService } from '../user/user.service';
import { PermissionService } from '../permission/permission.service';
import { SessionService } from '../session/session.service';
import { LoginDto, LoginByEmailDto, LoginByPhoneDto, RegisterDto } from './dto';

import { CaptchaService } from '../captcha/captcha.service';
import { LoginLogService } from '../login-log/login-log.service';
import { PasswordPolicyService } from '../password-policy/password-policy.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly userRepository: UserRepository,
    private readonly userService: UserService,
    private readonly permissionService: PermissionService,
    private readonly sessionService: SessionService,
    private readonly captchaService: CaptchaService,
    private readonly loginLogService: LoginLogService,
    private readonly passwordPolicyService: PasswordPolicyService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(AuthService.name);
  }

  // ===================== 注册 =====================

  @LogMethod()
  async register(dto: RegisterDto) {
    if (await this.userRepository.getByUsername(dto.username)) {
      throw new ConflictException('Username already exists');
    }
    if (dto.email && (await this.userRepository.getByEmail(dto.email))) {
      throw new ConflictException('Email already exists');
    }
    if (dto.phone && (await this.userRepository.getByPhone(dto.phone))) {
      throw new ConflictException('Phone already exists');
    }

    const hashed = await hashPassword(dto.password);
    const user = await this.userRepository.save(
      new UserEntity({
        username: dto.username,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        password: hashed,
        realName: null,
        nickName: dto.nickName ?? null,
        avatar: null,
        gender: 'unknown',
        birthday: null,
        employeeNo: null,
        jobTitle: null,
        isSuperAdmin: false,
        status: UserStatus.ACTIVE,
        loginFailCount: 0,
      }),
    );

    this.logger.info(
      `User registered: id=${user.id}, username=${user.username}`,
    );
    return { id: user.id, username: user.username, email: user.email };
  }

  // ===================== 登录 =====================

  @LogMethod()
  async login(dto: LoginDto, ip: string, userAgent: string) {
    // 验证码校验
    if (dto.captchaKey && dto.captchaCode) {
      const valid = await this.captchaService.verify(
        dto.captchaKey,
        dto.captchaCode,
      );
      if (!valid) {
        throw new UnauthorizedException('验证码错误或已过期');
      }
    }

    const user = await this.userRepository.getByUsername(dto.username);
    return this.authenticate(
      user,
      dto.password,
      dto.username,
      ip,
      userAgent,
      dto.rememberMe,
    );
  }

  @LogMethod()
  async loginByEmail(dto: LoginByEmailDto, ip: string, userAgent: string) {
    const user = await this.userRepository.getByEmail(dto.email);
    return this.authenticate(
      user,
      dto.password,
      dto.email,
      ip,
      userAgent,
      (dto as any).rememberMe,
    );
  }

  @LogMethod()
  async loginByPhone(dto: LoginByPhoneDto, ip: string, userAgent: string) {
    const user = await this.userRepository.getByPhone(dto.phone);
    return this.authenticate(
      user,
      dto.password,
      dto.phone,
      ip,
      userAgent,
      (dto as any).rememberMe,
    );
  }

  // ===================== 刷新 / 登出 =====================

  @LogMethod()
  async refresh(refreshToken: string, ip: string, userAgent: string) {
    const stored = await this.redisService.get(
      `${REFRESH_TOKEN_PREFIX}${refreshToken}`,
    );
    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const parsed = JSON.parse(stored);
    const now = Math.floor(Date.now() / 1000);
    if (parsed.exp < now) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.userRepository.getById(parsed.sub);
    if (!user || !user.isActive()) {
      throw new UnauthorizedException('User not found or inactive');
    }

    await this.sessionService.removeSession(refreshToken);

    const tokens = await this.generateTokens(
      user.id,
      user.username,
      user.email,
      user.isSuperAdmin,
      ip,
      userAgent,
    );

    this.logger.info(`Token refreshed: userId=${user.id}`);
    return tokens;
  }

  @LogMethod()
  async logout(refreshToken: string) {
    await this.sessionService.removeSession(refreshToken);
    return { message: 'Logged out successfully' };
  }

  // ===================== 当前用户信息 =====================

  async getUserInfoByToken(user: AuthenticatedUser) {
    const me = await this.userService.getMe(user.id);
    if (!me) throw new NotFoundException('User not found');

    const permissions = user.isSuperAdmin
      ? ['*']
      : await this.permissionService.listCodesByUserId(user.id);

    return { ...me, permissions };
  }

  async getMyPermissions(user: AuthenticatedUser) {
    const me = await this.userService.getMe(user.id);
    if (!me) throw new NotFoundException('User not found');

    const permissions = user.isSuperAdmin
      ? ['*']
      : await this.permissionService.listCodesByUserId(user.id);

    const roles = await this.userService.listRolesByUserId(user.id);

    // 获取数据权限范围
    const dataScopes = await this.prisma.roleDataPermissionScope.findMany({
      where: {
        roleId: { in: roles.map((r: any) => r.id) },
      },
    });

    return {
      userId: user.id,
      username: user.username,
      roles: roles.map((r: any) => ({
        id: r.id,
        name: r.name,
        code: r.code,
      })),
      permissions,
      dataScopes: dataScopes.map((s: any) => ({
        resourceCode: s.resourceCode,
        action: s.action,
        scope: s.scope,
      })),
    };
  }

  // ===================== 私有 =====================

  private readonly MAX_LOGIN_FAILS = 5;

  private async authenticate(
    user: UserEntity | null,
    password: string,
    accountLabel: string,
    ip = 'unknown',
    userAgent = '',
    rememberMe = false,
  ) {
    if (!user) {
      await this.loginLogService.create({
        username: accountLabel,
        ip,
        userAgent,
        status: 'fail',
        message: '用户不存在',
      });
      this.logger.warn(`Login failed - user not found: ${accountLabel}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'locked') {
      await this.loginLogService.create({
        userId: user.id,
        username: user.username,
        ip,
        userAgent,
        status: 'fail',
        message: '账号已锁定',
      });
      this.logger.warn(`Login failed - account locked: ${accountLabel}`);
      throw new UnauthorizedException('Account is locked');
    }
    if (user.status === 'banned') {
      await this.loginLogService.create({
        userId: user.id,
        username: user.username,
        ip,
        userAgent,
        status: 'fail',
        message: '账号已禁用',
      });
      this.logger.warn(`Login failed - account banned: ${accountLabel}`);
      throw new UnauthorizedException('Account is banned');
    }
    if (user.status === 'inactive') {
      await this.loginLogService.create({
        userId: user.id,
        username: user.username,
        ip,
        userAgent,
        status: 'fail',
        message: '账号未激活',
      });
      this.logger.warn(`Login failed - account inactive: ${accountLabel}`);
      throw new UnauthorizedException('Account is inactive');
    }

    // 检查密码是否过期
    const isExpired = await this.passwordPolicyService.isPasswordExpired(
      user.id,
    );
    if (isExpired) {
      await this.loginLogService.create({
        userId: user.id,
        username: user.username,
        ip,
        userAgent,
        status: 'fail',
        message: '密码已过期',
      });
      throw new UnauthorizedException('密码已过期，请修改密码');
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
      const policy = await this.passwordPolicyService.getPolicy();
      const newFailCount = (user.loginFailCount ?? 0) + 1;
      const shouldLock = newFailCount >= policy.maxLoginAttempts;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          loginFailCount: newFailCount,
          ...(shouldLock ? { status: 'locked' as const } : {}),
        },
      });

      await this.loginLogService.create({
        userId: user.id,
        username: user.username,
        ip,
        userAgent,
        status: 'fail',
        message: `密码错误（第${newFailCount}次）`,
      });

      this.logger.warn(
        `Login failed - invalid password: ${accountLabel}, failCount=${newFailCount}${shouldLock ? ', account locked' : ''}`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(
      user.id,
      user.username,
      user.email,
      user.isSuperAdmin,
      ip,
      userAgent,
      rememberMe,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), loginFailCount: 0, lastLoginIp: ip },
    });

    await this.loginLogService.create({
      userId: user.id,
      username: user.username,
      ip,
      userAgent,
      status: 'success',
    });

    this.logger.info(`Login success: id=${user.id}, username=${user.username}`);
    return tokens;
  }

  private async generateTokens(
    userId: number,
    username: string,
    email: string | null,
    isSuperAdmin: boolean,
    ip = 'unknown',
    userAgent = '',
    rememberMe = false,
  ) {
    const jwt = this.configService.get<{
      secret: string;
      expiresIn: any;
      refreshExpiresIn?: any;
    }>('jwt')!;

    const accessTokenJti = uuidv4();
    const payload = {
      sub: userId,
      username,
      email,
      isSuperAdmin,
      jti: accessTokenJti,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: jwt.secret,
      expiresIn: jwt.expiresIn,
    });

    const refreshTokenValue = uuidv4();
    // 记住我：30天，否则7天
    const refreshExpDays = rememberMe ? 30 : jwt.refreshExpiresIn || 7;
    const refreshExpSeconds = refreshExpDays * 86400;
    const expiresAt = Math.floor(Date.now() / 1000) + refreshExpSeconds;

    await this.redisService.set(
      `${REFRESH_TOKEN_PREFIX}${refreshTokenValue}`,
      JSON.stringify({
        sub: userId,
        exp: expiresAt,
      }),
      refreshExpSeconds,
    );

    await this.sessionService.createSession(
      userId,
      username,
      refreshTokenValue,
      {
        ip,
        userAgent,
        loginAt: new Date().toISOString(),
        expiresAt,
        accessTokenJti,
      },
    );

    return {
      accessToken,
      refreshToken: refreshTokenValue,
    };
  }

  // ===================== 忘记密码 =====================

  @LogMethod()
  async forgotPassword(dto: { username: string }) {
    const user = await this.userRepository.getByUsername(dto.username);

    // 无论用户是否存在，都返回相同消息（防止枚举攻击）
    if (!user) {
      return { message: 'If the account exists, a reset code has been sent' };
    }

    // 生成6位验证码（使用加密安全的随机数）
    const code = randomInt(100000, 999999).toString();
    const key = `password_reset:${dto.username}`;

    // 存入Redis，5分钟过期
    await this.redisService.set(key, code, 300);

    // TODO: 接入邮件/短信发送
    this.logger.info(
      `Password reset code generated: user=${dto.username}, code=${code}`,
    );

    return {
      message: 'If the account exists, a reset code has been sent',
    };
  }

  @LogMethod()
  async resetPassword(dto: {
    username: string;
    code: string;
    newPassword: string;
  }) {
    const key = `password_reset:${dto.username}`;
    const storedCode = await this.redisService.get(key);

    if (!storedCode || storedCode !== dto.code) {
      throw new UnauthorizedException('Invalid or expired reset code');
    }

    const user = await this.userRepository.getByUsername(dto.username);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 检查密码策略
    try {
      await this.passwordPolicyService.validatePassword(dto.newPassword);
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }

    const hashed = await hashPassword(dto.newPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        passwordChangedAt: new Date(),
        loginFailCount: 0,
      },
    });

    // 删除验证码
    await this.redisService.del(key);

    // 记录到密码历史
    await this.passwordPolicyService.addPasswordHistory(user.id, hashed);

    // 使所有会话失效（要求重新登录）
    await this.sessionService.removeAllSessionsByUser(user.id);

    this.logger.info(`Password reset successful: user=${dto.username}`);
    return { message: 'Password reset successfully' };
  }
}
