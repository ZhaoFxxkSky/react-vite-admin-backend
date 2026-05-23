import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
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
import { UserEntity } from '../user/domain/entities/user.entity';
import { UserRepository } from '../user/infrastructure/repositories/user.repository';
import { UserService } from '../user/user.service';
import { PermissionService } from '../permission/permission.service';
import { SessionService } from '../session/session.service';
import { LoginDto, LoginByEmailDto, LoginByPhoneDto, RegisterDto } from './dto';
import { UAParser } from 'ua-parser-js';
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
      const valid = await this.captchaService.verify(dto.captchaKey, dto.captchaCode);
      if (!valid) {
        throw new UnauthorizedException('验证码错误或已过期');
      }
    }
    
    const user = await this.userRepository.getByUsername(dto.username);
    return this.authenticate(user, dto.password, dto.username, ip, userAgent);
  }

  @LogMethod()
  async loginByEmail(dto: LoginByEmailDto, ip: string, userAgent: string) {
    const user = await this.userRepository.getByEmail(dto.email);
    return this.authenticate(user, dto.password, dto.email, ip, userAgent);
  }

  @LogMethod()
  async loginByPhone(dto: LoginByPhoneDto, ip: string, userAgent: string) {
    const user = await this.userRepository.getByPhone(dto.phone);
    return this.authenticate(user, dto.password, dto.phone, ip, userAgent);
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

  // ===================== 私有 =====================

  private readonly MAX_LOGIN_FAILS = 5;

  private async authenticate(
    user: UserEntity | null,
    password: string,
    accountLabel: string,
    ip = 'unknown',
    userAgent = '',
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
    const isExpired = await this.passwordPolicyService.isPasswordExpired(user.id);
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
    const refreshExp = jwt.refreshExpiresIn || '7d';
    const refreshExpSeconds = parseInt(refreshExp, 10) * 86400;
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
}
