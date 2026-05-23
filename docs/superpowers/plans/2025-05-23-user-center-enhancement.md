# 用户中心功能补全实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Data Space 用户中心补全 11 个功能模块：图形验证码、登录日志、登录安全策略、密码策略、岗位管理、数据字典、参数配置、Excel 导入导出、个人中心完善、第三方登录、API 限流。

**Architecture:** 基于现有 NestJS 11 Monorepo + Prisma + MariaDB + Redis 架构，遵循 DDD 四层分层，每个新模块独立实现（Controller / Service / Repository / DTO），复用现有基础设施（ guards, interceptors, prisma service, redis service ）。

**Tech Stack:** NestJS 11, Prisma 7, MariaDB, Redis, Zod, @nestjs/swagger, svg-captcha, node-xlsx, @nestjs/throttler, passport-oauth2

---

## 文件结构映射

### 新增模块目录结构

```
apps/user-service/src/modules/
├── captcha/                    # 图形验证码模块
│   ├── captcha.controller.ts
│   ├── captcha.service.ts
│   ├── captcha.module.ts
│   └── dto/
│       └── verify-captcha.dto.ts
├── login-log/                  # 登录日志模块
│   ├── login-log.controller.ts
│   ├── login-log.service.ts
│   ├── login-log.module.ts
│   └── dto/
│       └── list-login-log.dto.ts
├── password-policy/            # 密码策略模块
│   ├── password-policy.controller.ts
│   ├── password-policy.service.ts
│   ├── password-policy.module.ts
│   └── dto/
│       └── update-policy.dto.ts
├── post/                       # 岗位管理模块
│   ├── post.controller.ts
│   ├── post.service.ts
│   ├── post.module.ts
│   └── dto/
│       └── create-post.dto.ts
├── dict/                       # 数据字典模块
│   ├── dict.controller.ts
│   ├── dict.service.ts
│   ├── dict.module.ts
│   └── dto/
│       └── create-dict.dto.ts
├── config/                     # 参数配置模块
│   ├── config.controller.ts
│   ├── config.service.ts
│   ├── config.module.ts
│   └── dto/
│       └── create-config.dto.ts
├── excel/                      # Excel 导入导出工具模块
│   ├── excel.service.ts
│   ├── excel.module.ts
│   └── templates/
│       └── user-template.xlsx
├── oauth/                      # 第三方登录模块
│   ├── oauth.controller.ts
│   ├── oauth.service.ts
│   ├── oauth.module.ts
│   └── strategies/
│       ├── github.strategy.ts
│       └── wechat.strategy.ts
├── throttler/                  # API 限流模块（自定义）
│   ├── throttler.module.ts
│   └── guards/
│       └── custom-throttler.guard.ts
└── user/                       # 现有模块扩展
    ├── user.controller.ts      # 扩展：导入导出、个人中心
    └── dto/
        └── import-user.dto.ts

prisma/schema.prisma            # 扩展：新增表模型
```

### 修改的现有文件

```
apps/user-service/src/app.module.ts              # 导入新模块
apps/user-service/src/bootstrap.ts               # 注册限流守卫
apps/user-service/src/modules/auth/auth.service.ts  # 集成验证码、登录日志、密码策略
apps/user-service/src/modules/user/user.controller.ts  # 扩展导入导出、个人中心
libs/core/src/guards/jwt.guard.ts                # 扩展：限流集成
prisma/schema.prisma                              # 新增表模型
```

---

## Phase 1: 基础安全（图形验证码 + 登录日志 + 密码策略 + 登录安全策略）

### Task 1.1: 图形验证码模块

**目标:** 实现图形验证码生成和校验，用于登录接口防暴力破解。

**新建文件:**
- `apps/user-service/src/modules/captcha/captcha.module.ts`
- `apps/user-service/src/modules/captcha/captcha.service.ts`
- `apps/user-service/src/modules/captcha/captcha.controller.ts`

**修改文件:**
- `apps/user-service/src/app.module.ts` — 导入 CaptchaModule
- `apps/user-service/src/modules/auth/auth.service.ts` — 登录时校验验证码

**依赖:** svg-captcha, @types/svg-captcha

---

- [ ] **Step 1: 安装依赖**

```bash
cd D:\私有项目\backend\data-space
pnpm add svg-captcha
pnpm add -D @types/svg-captcha
```

- [ ] **Step 2: 创建 CaptchaModule**

```typescript
// apps/user-service/src/modules/captcha/captcha.module.ts
import { Module } from '@nestjs/common';
import { CaptchaService } from './captcha.service';
import { CaptchaController } from './captcha.controller';
import { RedisService } from '@core';

@Module({
  controllers: [CaptchaController],
  providers: [CaptchaService, RedisService],
  exports: [CaptchaService],
})
export class CaptchaModule {}
```

- [ ] **Step 3: 创建 CaptchaService**

```typescript
// apps/user-service/src/modules/captcha/captcha.service.ts
import { Injectable } from '@nestjs/common';
import * as svgCaptcha from 'svg-captcha';
import { RedisService } from '@core';

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

    const key = `captcha:${Date.now()}:${Math.random().toString(36).substring(2, 8)}`;
    await this.redisService.set(
      `${this.CAPTCHA_PREFIX}${key}`,
      captcha.text.toLowerCase(),
      this.CAPTCHA_EXPIRY,
    );

    return {
      key,
      svg: captcha.data,
    };
  }

  async verify(key: string, code: string): Promise<boolean> {
    if (!key || !code) return false;
    const storedCode = await this.redisService.get(`${this.CAPTCHA_PREFIX}${key}`);
    if (!storedCode) return false;
    await this.redisService.del(`${this.CAPTCHA_PREFIX}${key}`);
    return storedCode === code.toLowerCase();
  }
}
```

- [ ] **Step 4: 创建 CaptchaController**

```typescript
// apps/user-service/src/modules/captcha/captcha.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '@core';
import { CaptchaService } from './captcha.service';

@ApiTags('Captcha')
@Controller('captcha')
export class CaptchaController {
  constructor(private readonly captchaService: CaptchaService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '获取图形验证码' })
  async getCaptcha(@Query('type') type: 'math' | 'text' = 'text') {
    const result = await this.captchaService.generate(type);
    return {
      key: result.key,
      svg: result.svg,
    };
  }
}
```

- [ ] **Step 5: 修改 AuthService 集成验证码校验**

在 `apps/user-service/src/modules/auth/auth.service.ts` 的登录方法中添加：

```typescript
// 在 AuthService 的 login 方法中
async login(dto: LoginDto, ip?: string, userAgent?: string) {
  // 验证码校验（如果请求中包含 captchaKey 和 captchaCode）
  if (dto.captchaKey && dto.captchaCode) {
    const valid = await this.captchaService.verify(dto.captchaKey, dto.captchaCode);
    if (!valid) {
      throw new UnauthorizedException('验证码错误或已过期');
    }
  }
  
  // 原有登录逻辑...
}
```

- [ ] **Step 6: 注册模块**

修改 `apps/user-service/src/app.module.ts`，在 imports 数组中添加：

```typescript
import { CaptchaModule } from './modules/captcha/captcha.module';

// 在 imports 中添加
CaptchaModule,
```

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: 添加图形验证码模块"
```

---

### Task 1.2: 登录日志模块

**目标:** 记录每次登录尝试的详细信息，支持查询和审计。

**新建文件:**
- `apps/user-service/src/modules/login-log/login-log.module.ts`
- `apps/user-service/src/modules/login-log/login-log.service.ts`
- `apps/user-service/src/modules/login-log/login-log.controller.ts`
- `apps/user-service/src/modules/login-log/dto/list-login-log.dto.ts`

**修改文件:**
- `prisma/schema.prisma` — 新增 LoginLog 表
- `apps/user-service/src/app.module.ts` — 导入 LoginLogModule
- `apps/user-service/src/modules/auth/auth.service.ts` — 登录时记录日志

---

- [ ] **Step 1: 新增 Prisma 模型**

在 `prisma/schema.prisma` 末尾添加：

```prisma
model LoginLog {
  id        Int      @id @default(autoincrement())
  userId    Int?     @map("user_id")
  username  String?  @db.VarChar(50)
  ip        String?  @db.VarChar(50)
  userAgent String?  @map("user_agent") @db.VarChar(500)
  location  String?  @db.VarChar(100)
  status    String   @default("success") @db.VarChar(20) // success / fail
  message   String?  @db.VarChar(255)
  loginType String   @default("password") @map("login_type") @db.VarChar(20) // password / oauth
  createdAt DateTime @default(now()) @map("created_at")

  @@map("tds_login_logs")
  @@index([userId])
  @@index([createdAt])
}
```

- [ ] **Step 2: 生成迁移**

```bash
pnpm db:migrate
```

- [ ] **Step 3: 创建 LoginLogModule**

```typescript
// apps/user-service/src/modules/login-log/login-log.module.ts
import { Module } from '@nestjs/common';
import { LoginLogService } from './login-log.service';
import { LoginLogController } from './login-log.controller';

@Module({
  controllers: [LoginLogController],
  providers: [LoginLogService],
  exports: [LoginLogService],
})
export class LoginLogModule {}
```

- [ ] **Step 4: 创建 LoginLogService**

```typescript
// apps/user-service/src/modules/login-log/login-log.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core';

@Injectable()
export class LoginLogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId?: number;
    username?: string;
    ip?: string;
    userAgent?: string;
    location?: string;
    status: string;
    message?: string;
    loginType?: string;
  }) {
    return this.prisma.loginLog.create({ data });
  }

  async findMany(query: {
    userId?: number;
    username?: string;
    status?: string;
    startTime?: Date;
    endTime?: Date;
    page?: number;
    pageSize?: number;
  }) {
    const { userId, username, status, startTime, endTime, page = 1, pageSize = 10 } = query;
    
    const where: any = {};
    if (userId) where.userId = userId;
    if (username) where.username = { contains: username };
    if (status) where.status = status;
    if (startTime || endTime) {
      where.createdAt = {};
      if (startTime) where.createdAt.gte = startTime;
      if (endTime) where.createdAt.lte = endTime;
    }

    const [list, total] = await Promise.all([
      this.prisma.loginLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.loginLog.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }
}
```

- [ ] **Step 5: 创建 LoginLogController**

```typescript
// apps/user-service/src/modules/login-log/login-log.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LoginLogService } from './login-log.service';
import { ApiPermission } from '@core';

@ApiTags('LoginLogs')
@Controller('login-logs')
export class LoginLogController {
  constructor(private readonly loginLogService: LoginLogService) {}

  @Get()
  @ApiPermission({
    code: 'system:login-log:list',
    name: '查询登录日志',
    module: '登录日志',
  })
  @ApiOperation({ summary: '分页查询登录日志' })
  async findMany(@Query() query: any) {
    return this.loginLogService.findMany(query);
  }
}
```

- [ ] **Step 6: 修改 AuthService 记录登录日志**

在登录成功和失败时记录日志：

```typescript
// 在 AuthService 注入 LoginLogService
constructor(
  // ... 其他依赖
  private readonly loginLogService: LoginLogService,
) {}

// 登录成功时
async login(dto: LoginDto, ip?: string, userAgent?: string) {
  try {
    // ... 原有登录逻辑
    
    // 记录成功日志
    await this.loginLogService.create({
      userId: user.id,
      username: user.username,
      ip,
      userAgent,
      status: 'success',
      loginType: 'password',
    });
    
    return tokens;
  } catch (error) {
    // 记录失败日志
    await this.loginLogService.create({
      username: dto.username,
      ip,
      userAgent,
      status: 'fail',
      message: error.message,
      loginType: 'password',
    });
    throw error;
  }
}
```

- [ ] **Step 7: 注册模块并 Commit**

```bash
# 修改 app.module.ts 导入 LoginLogModule
git add .
git commit -m "feat: 添加登录日志模块"
```

---

### Task 1.3: 密码策略模块

**目标:** 实现系统级密码策略配置，包括复杂度要求、过期时间、历史密码限制。

**新建文件:**
- `apps/user-service/src/modules/password-policy/password-policy.module.ts`
- `apps/user-service/src/modules/password-policy/password-policy.service.ts`
- `apps/user-service/src/modules/password-policy/password-policy.controller.ts`
- `apps/user-service/src/modules/password-policy/dto/update-policy.dto.ts`

**修改文件:**
- `prisma/schema.prisma` — 新增 PasswordPolicy 表
- `apps/user-service/src/modules/user/user.service.ts` — 修改密码时校验策略
- `apps/user-service/src/modules/auth/auth.service.ts` — 登录时检查密码过期

---

- [ ] **Step 1: 新增 Prisma 模型**

```prisma
model PasswordPolicy {
  id                Int      @id @default(autoincrement())
  minLength         Int      @default(8) @map("min_length")
  maxLength         Int      @default(32) @map("max_length")
  requireUppercase  Boolean  @default(true) @map("require_uppercase")
  requireLowercase  Boolean  @default(true) @map("require_lowercase")
  requireNumbers    Boolean  @default(true) @map("require_numbers")
  requireSymbols    Boolean  @default(false) @map("require_symbols")
  expiryDays        Int      @default(90) @map("expiry_days")
  historyCount      Int      @default(5) @map("history_count")
  maxLoginAttempts  Int      @default(5) @map("max_login_attempts")
  lockoutDuration   Int      @default(30) @map("lockout_duration") // 分钟
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @default(now()) @updatedAt @map("updated_at")

  @@map("tds_password_policies")
}

model PasswordHistory {
  id        Int      @id @default(autoincrement())
  userId    Int      @map("user_id")
  password  String   @db.VarChar(255) // 加密后的密码
  createdAt DateTime @default(now()) @map("created_at")

  @@map("tds_password_histories")
  @@index([userId])
}
```

- [ ] **Step 2: 生成迁移并创建默认策略**

```bash
pnpm db:migrate
```

- [ ] **Step 3: 创建 PasswordPolicyService**

```typescript
// apps/user-service/src/modules/password-policy/password-policy.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@core';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class PasswordPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async getPolicy() {
    const policy = await this.prisma.passwordPolicy.findFirst();
    if (!policy) {
      // 创建默认策略
      return this.prisma.passwordPolicy.create({
        data: {
          minLength: 8,
          maxLength: 32,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSymbols: false,
          expiryDays: 90,
          historyCount: 5,
          maxLoginAttempts: 5,
          lockoutDuration: 30,
        },
      });
    }
    return policy;
  }

  async updatePolicy(data: any) {
    const policy = await this.getPolicy();
    return this.prisma.passwordPolicy.update({
      where: { id: policy.id },
      data,
    });
  }

  async validatePassword(password: string) {
    const policy = await this.getPolicy();
    
    if (password.length < policy.minLength) {
      throw new BadRequestException(`密码长度至少 ${policy.minLength} 位`);
    }
    if (password.length > policy.maxLength) {
      throw new BadRequestException(`密码长度最多 ${policy.maxLength} 位`);
    }
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      throw new BadRequestException('密码必须包含大写字母');
    }
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      throw new BadRequestException('密码必须包含小写字母');
    }
    if (policy.requireNumbers && !/\d/.test(password)) {
      throw new BadRequestException('密码必须包含数字');
    }
    if (policy.requireSymbols && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new BadRequestException('密码必须包含特殊字符');
    }
  }

  async checkPasswordHistory(userId: number, newPassword: string) {
    const policy = await this.getPolicy();
    const histories = await this.prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: policy.historyCount,
    });

    for (const history of histories) {
      const isMatch = await bcrypt.compare(newPassword, history.password);
      if (isMatch) {
        throw new BadRequestException(`不能使用最近 ${policy.historyCount} 次使用过的密码`);
      }
    }
  }

  async addPasswordHistory(userId: number, password: string) {
    await this.prisma.passwordHistory.create({
      data: { userId, password },
    });
  }

  async isPasswordExpired(userId: number) {
    const policy = await this.getPolicy();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordChangedAt: true },
    });
    
    if (!user?.passwordChangedAt) return false;
    
    const expiryDate = new Date(user.passwordChangedAt);
    expiryDate.setDate(expiryDate.getDate() + policy.expiryDays);
    
    return new Date() > expiryDate;
  }
}
```

- [ ] **Step 4: 创建 Controller 和 DTO**

```typescript
// apps/user-service/src/modules/password-policy/password-policy.controller.ts
import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PasswordPolicyService } from './password-policy.service';
import { ApiPermission } from '@core';

@ApiTags('PasswordPolicy')
@Controller('password-policy')
export class PasswordPolicyController {
  constructor(private readonly passwordPolicyService: PasswordPolicyService) {}

  @Get()
  @ApiPermission({
    code: 'system:password-policy:view',
    name: '查看密码策略',
    module: '密码策略',
  })
  @ApiOperation({ summary: '获取密码策略' })
  async getPolicy() {
    return this.passwordPolicyService.getPolicy();
  }

  @Put()
  @ApiPermission({
    code: 'system:password-policy:update',
    name: '修改密码策略',
    module: '密码策略',
  })
  @ApiOperation({ summary: '更新密码策略' })
  async updatePolicy(@Body() dto: any) {
    return this.passwordPolicyService.updatePolicy(dto);
  }
}
```

- [ ] **Step 5: 修改 UserService 集成密码策略**

在修改密码时：
1. 校验密码复杂度
2. 检查历史密码
3. 记录密码历史
4. 更新 passwordChangedAt

```typescript
// 在 UserService 中
async changePassword(userId: number, oldPassword: string, newPassword: string) {
  // 校验新密码复杂度
  await this.passwordPolicyService.validatePassword(newPassword);
  
  // 检查历史密码
  await this.passwordPolicyService.checkPasswordHistory(userId, newPassword);
  
  // ... 原有修改密码逻辑
  
  // 记录密码历史
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await this.passwordPolicyService.addPasswordHistory(userId, hashedPassword);
  
  // 更新密码修改时间
  await this.prisma.user.update({
    where: { id: userId },
    data: { passwordChangedAt: new Date() },
  });
}
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: 添加密码策略模块"
```

---

### Task 1.4: 登录安全策略

**目标:** 实现连续登录失败锁定、密码过期检查、异地登录检测。

**实现方式:** 复用现有 User 表的 loginFailCount 字段，扩展 AuthService 逻辑。

**修改文件:**
- `apps/user-service/src/modules/auth/auth.service.ts` — 添加锁定和过期检查
- `apps/user-service/src/modules/user/user.service.ts` — 添加解锁接口

---

- [ ] **Step 1: 扩展 AuthService 登录逻辑**

```typescript
// 在 AuthService 的 login 方法中
async login(dto: LoginDto, ip?: string, userAgent?: string) {
  const user = await this.prisma.user.findUnique({
    where: { username: dto.username },
  });
  
  if (!user) {
    throw new UnauthorizedException('用户名或密码错误');
  }
  
  // 检查账号是否被锁定
  if (user.status === 'locked') {
    throw new UnauthorizedException('账号已被锁定，请联系管理员');
  }
  
  // 密码过期检查
  const isExpired = await this.passwordPolicyService.isPasswordExpired(user.id);
  if (isExpired) {
    throw new UnauthorizedException('密码已过期，请修改密码');
  }
  
  // 验证密码
  const isPasswordValid = await bcrypt.compare(dto.password, user.password);
  
  if (!isPasswordValid) {
    // 增加失败次数
    const policy = await this.passwordPolicyService.getPolicy();
    const newFailCount = user.loginFailCount + 1;
    
    await this.prisma.user.update({
      where: { id: user.id },
      data: { 
        loginFailCount: newFailCount,
        // 如果达到最大尝试次数，锁定账号
        status: newFailCount >= policy.maxLoginAttempts ? 'locked' : user.status,
      },
    });
    
    throw new UnauthorizedException(
      newFailCount >= policy.maxLoginAttempts 
        ? '连续登录失败次数过多，账号已锁定'
        : '用户名或密码错误'
    );
  }
  
  // 登录成功，重置失败次数
  await this.prisma.user.update({
    where: { id: user.id },
    data: { 
      loginFailCount: 0,
      lastLoginAt: new Date(),
      lastLoginIp: ip,
    },
  });
  
  // ... 原有登录逻辑
}
```

- [ ] **Step 2: 添加用户解锁接口**

```typescript
// 在 UserController 中添加
@Post(':id/unlock')
@ApiPermission({
  code: 'system:user:unlock',
  name: '解锁用户',
  module: '用户管理',
})
@ApiOperation({ summary: '解锁被锁定的用户账号' })
async unlockUser(@Param('id', ParseIntPipe) id: number) {
  return this.userService.updateStatus(id, 'active');
}
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: 添加登录安全策略（失败锁定、密码过期检查）"
```

---

## Phase 2: 基础数据（岗位管理 + 数据字典 + 参数配置）

### Task 2.1: 岗位管理模块

**目标:** 独立于角色的职位体系管理（如：技术总监、高级工程师、产品经理）。

**新建文件:**
- `apps/user-service/src/modules/post/post.module.ts`
- `apps/user-service/src/modules/post/post.service.ts`
- `apps/user-service/src/modules/post/post.controller.ts`
- `apps/user-service/src/modules/post/dto/create-post.dto.ts`

**修改文件:**
- `prisma/schema.prisma` — 新增 Post 表和 UserPost 关联表
- `apps/user-service/src/app.module.ts` — 导入 PostModule

---

- [ ] **Step 1: 新增 Prisma 模型**

```prisma
model Post {
  id          Int      @id @default(autoincrement())
  code        String   @unique @db.VarChar(50)
  name        String   @db.VarChar(50)
  level       Int      @default(1) // 岗位级别
  sortOrder   Int      @default(0) @map("sort_order")
  status      String   @default("active") @db.VarChar(20)
  description String?  @db.VarChar(255)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @default(now()) @updatedAt @map("updated_at")

  userPosts   UserPost[]

  @@map("tds_posts")
}

model UserPost {
  userId    Int      @map("user_id")
  postId    Int      @map("post_id")
  isPrimary Boolean  @default(true) @map("is_primary")
  createdAt DateTime @default(now()) @map("created_at")

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@id([userId, postId])
  @@map("tds_user_posts")
}
```

修改 User 模型添加关联：
```prisma
model User {
  // ... 现有字段
  userPosts    UserPost[]
  // ... 其他关联
}
```

- [ ] **Step 2: 生成迁移**

```bash
pnpm db:migrate
```

- [ ] **Step 3: 创建完整的 Post 模块**

```typescript
// apps/user-service/src/modules/post/post.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core';

@Injectable()
export class PostService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { code: string; name: string; level?: number; description?: string }) {
    return this.prisma.post.create({ data });
  }

  async findMany(query: { page?: number; pageSize?: number; status?: string }) {
    const { page = 1, pageSize = 10, status } = query;
    const where = status ? { status } : {};
    
    const [list, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.post.count({ where }),
    ]);
    
    return { list, total, page, pageSize };
  }

  async findById(id: number) {
    return this.prisma.post.findUnique({ where: { id } });
  }

  async update(id: number, data: any) {
    return this.prisma.post.update({ where: { id }, data });
  }

  async delete(id: number) {
    return this.prisma.post.delete({ where: { id } });
  }

  async assignToUser(userId: number, postIds: number[]) {
    // 先删除现有岗位
    await this.prisma.userPost.deleteMany({ where: { userId } });
    
    // 添加新岗位
    if (postIds.length > 0) {
      await this.prisma.userPost.createMany({
        data: postIds.map((postId, index) => ({
          userId,
          postId,
          isPrimary: index === 0,
        })),
      });
    }
  }
}
```

- [ ] **Step 4: 注册模块并 Commit**

```bash
git add .
git commit -m "feat: 添加岗位管理模块"
```

---

### Task 2.2: 数据字典模块

**目标:** 系统级枚举管理，支持前端动态获取下拉选项。

**新建文件:**
- `apps/user-service/src/modules/dict/dict.module.ts`
- `apps/user-service/src/modules/dict/dict.service.ts`
- `apps/user-service/src/modules/dict/dict.controller.ts`
- `apps/user-service/src/modules/dict/dto/create-dict.dto.ts`

**修改文件:**
- `prisma/schema.prisma` — 新增 DictType 和 DictData 表

---

- [ ] **Step 1: 新增 Prisma 模型**

```prisma
model DictType {
  id          Int      @id @default(autoincrement())
  code        String   @unique @db.VarChar(50)
  name        String   @db.VarChar(50)
  description String?  @db.VarChar(255)
  status      String   @default("active") @db.VarChar(20)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @default(now()) @updatedAt @map("updated_at")

  dictData    DictData[]

  @@map("tds_dict_types")
}

model DictData {
  id        Int      @id @default(autoincrement())
  dictId    Int      @map("dict_id")
  label     String   @db.VarChar(50)
  value     String   @db.VarChar(50)
  sortOrder Int      @default(0) @map("sort_order")
  status    String   @default("active") @db.VarChar(20)
  remark    String?  @db.VarChar(255)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at")

  dictType  DictType @relation(fields: [dictId], references: [id], onDelete: Cascade)

  @@map("tds_dict_data")
  @@index([dictId])
}
```

- [ ] **Step 2: 生成迁移并创建 Service**

```bash
pnpm db:migrate
```

```typescript
// apps/user-service/src/modules/dict/dict.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core';

@Injectable()
export class DictService {
  constructor(private readonly prisma: PrismaService) {}

  // 字典类型管理
  async createType(data: { code: string; name: string; description?: string }) {
    return this.prisma.dictType.create({ data });
  }

  async findAllTypes() {
    return this.prisma.dictType.findMany({
      where: { status: 'active' },
      include: { dictData: { where: { status: 'active' } } },
    });
  }

  // 字典数据管理
  async createData(data: { dictId: number; label: string; value: string; sortOrder?: number }) {
    return this.prisma.dictData.create({ data });
  }

  async getDictByCode(code: string) {
    const dict = await this.prisma.dictType.findUnique({
      where: { code },
      include: {
        dictData: {
          where: { status: 'active' },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    
    if (!dict) return null;
    
    return {
      code: dict.code,
      name: dict.name,
      data: dict.dictData.map(item => ({
        label: item.label,
        value: item.value,
        sortOrder: item.sortOrder,
      })),
    };
  }
}
```

- [ ] **Step 3: 创建 Controller**

```typescript
// apps/user-service/src/modules/dict/dict.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DictService } from './dict.service';
import { Public } from '@core';

@ApiTags('Dict')
@Controller('dict')
export class DictController {
  constructor(private readonly dictService: DictService) {}

  @Get('types')
  @ApiOperation({ summary: '获取所有字典类型' })
  async findAllTypes() {
    return this.dictService.findAllTypes();
  }

  @Get(':code')
  @Public()
  @ApiOperation({ summary: '根据编码获取字典数据' })
  async getDictByCode(@Param('code') code: string) {
    return this.dictService.getDictByCode(code);
  }

  // ... 其他 CRUD 接口
}
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: 添加数据字典模块"
```

---

### Task 2.3: 参数配置模块

**目标:** 动态系统参数管理，支持运行时修改配置。

**新建文件:**
- `apps/user-service/src/modules/config/config.module.ts`
- `apps/user-service/src/modules/config/config.service.ts`
- `apps/user-service/src/modules/config/config.controller.ts`

**修改文件:**
- `prisma/schema.prisma` — 新增 SysConfig 表

---

- [ ] **Step 1: 新增 Prisma 模型**

```prisma
model SysConfig {
  id          Int      @id @default(autoincrement())
  key         String   @unique @db.VarChar(100)
  value       String   @db.Text
  type        String   @default("string") @db.VarChar(20) // string / number / boolean / json
  group       String   @default("system") @db.VarChar(50) // system / security / file
  name        String   @db.VarChar(100)
  description String?  @db.VarChar(255)
  isBuiltIn   Boolean  @default(false) @map("is_built_in")
  status      String   @default("active") @db.VarChar(20)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @default(now()) @updatedAt @map("updated_at")

  @@map("tds_sys_configs")
}
```

- [ ] **Step 2: 生成迁移并创建 Service**

```bash
pnpm db:migrate
```

```typescript
// apps/user-service/src/modules/config/config.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core';

@Injectable()
export class SysConfigService {
  private configCache: Map<string, any> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  async getValue(key: string, defaultValue?: any) {
    // 先查缓存
    if (this.configCache.has(key)) {
      return this.configCache.get(key);
    }

    const config = await this.prisma.sysConfig.findUnique({
      where: { key, status: 'active' },
    });

    if (!config) return defaultValue;

    let value: any = config.value;
    switch (config.type) {
      case 'number':
        value = Number(value);
        break;
      case 'boolean':
        value = value === 'true' || value === '1';
        break;
      case 'json':
        try {
          value = JSON.parse(value);
        } catch {
          value = defaultValue;
        }
        break;
    }

    this.configCache.set(key, value);
    return value;
  }

  async setValue(key: string, value: any) {
    const config = await this.prisma.sysConfig.findUnique({ where: { key } });
    
    if (!config) {
      throw new Error(`配置项 ${key} 不存在`);
    }

    let strValue = String(value);
    if (config.type === 'json') {
      strValue = JSON.stringify(value);
    }

    await this.prisma.sysConfig.update({
      where: { key },
      data: { value: strValue },
    });

    // 更新缓存
    this.configCache.set(key, value);
  }

  async refreshCache() {
    this.configCache.clear();
    const configs = await this.prisma.sysConfig.findMany({
      where: { status: 'active' },
    });
    
    for (const config of configs) {
      this.configCache.set(config.key, config.value);
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: 添加参数配置模块"
```

---

## Phase 3: 用户体验（Excel 导入导出 + 个人中心完善）

### Task 3.1: Excel 导入导出模块

**目标:** 支持用户数据的批量导入和导出。

**新建文件:**
- `apps/user-service/src/modules/excel/excel.module.ts`
- `apps/user-service/src/modules/excel/excel.service.ts`

**修改文件:**
- `apps/user-service/src/modules/user/user.controller.ts` — 添加导入导出接口
- `apps/user-service/src/modules/user/user.service.ts` — 添加批量导入逻辑

**依赖:** xlsx, @types/xlsx

---

- [ ] **Step 1: 安装依赖**

```bash
pnpm add xlsx
pnpm add -D @types/xlsx
```

- [ ] **Step 2: 创建 ExcelService**

```typescript
// apps/user-service/src/modules/excel/excel.service.ts
import { Injectable } from '@nestjs/common';
import * as xlsx from 'xlsx';

@Injectable()
export class ExcelService {
  // 导出数据到 Excel Buffer
  export(data: any[], headers: { key: string; label: string }[]): Buffer {
    const worksheetData = [
      headers.map(h => h.label),
      ...data.map(row => headers.map(h => row[h.key])),
    ];
    
    const worksheet = xlsx.utils.aoa_to_sheet(worksheetData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    
    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  // 从 Excel Buffer 解析数据
  parse(buffer: Buffer): any[] {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    return xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  }

  // 生成导入模板
  generateTemplate(headers: { key: string; label: string; required?: boolean }[]): Buffer {
    const headerRow = headers.map(h => `${h.label}${h.required ? '(*)' : ''}`);
    const exampleRow = headers.map(() => '');
    
    const worksheetData = [headerRow, exampleRow];
    const worksheet = xlsx.utils.aoa_to_sheet(worksheetData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, '导入模板');
    
    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}
```

- [ ] **Step 3: 扩展 UserController**

```typescript
// 在 UserController 中添加
@Get('export')
@ApiPermission({
  code: 'system:user:export',
  name: '导出用户',
  module: '用户管理',
})
@ApiOperation({ summary: '导出用户列表到 Excel' })
async exportUsers(@Query() query: any, @Res() res: Response) {
  const result = await this.userService.findMany(query);
  const excelService = new ExcelService();
  
  const headers = [
    { key: 'id', label: 'ID' },
    { key: 'username', label: '用户名' },
    { key: 'realName', label: '真实姓名' },
    { key: 'email', label: '邮箱' },
    { key: 'phone', label: '手机号' },
    { key: 'status', label: '状态' },
    { key: 'createdAt', label: '创建时间' },
  ];
  
  const buffer = excelService.export(result.list, headers);
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=users.xlsx');
  res.send(buffer);
}

@Post('import')
@ApiPermission({
  code: 'system:user:import',
  name: '导入用户',
  module: '用户管理',
})
@ApiOperation({ summary: '从 Excel 批量导入用户' })
@UseInterceptors(FileInterceptor('file'))
async importUsers(@UploadedFile() file: Express.Multer.File) {
  const excelService = new ExcelService();
  const data = excelService.parse(file.buffer);
  
  // 跳过表头
  const rows = data.slice(1);
  
  const results = {
    success: 0,
    fail: 0,
    errors: [] as string[],
  };
  
  for (const row of rows) {
    try {
      await this.userService.create({
        username: row[0],
        realName: row[1],
        email: row[2],
        phone: row[3],
        password: '123456', // 默认密码，首次登录强制修改
      });
      results.success++;
    } catch (error) {
      results.fail++;
      results.errors.push(`第 ${rows.indexOf(row) + 2} 行: ${error.message}`);
    }
  }
  
  return results;
}

@Get('import-template')
@ApiOperation({ summary: '下载用户导入模板' })
async downloadTemplate(@Res() res: Response) {
  const excelService = new ExcelService();
  const headers = [
    { key: 'username', label: '用户名', required: true },
    { key: 'realName', label: '真实姓名', required: true },
    { key: 'email', label: '邮箱', required: false },
    { key: 'phone', label: '手机号', required: false },
  ];
  
  const buffer = excelService.generateTemplate(headers);
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=user-import-template.xlsx');
  res.send(buffer);
}
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: 添加 Excel 导入导出功能"
```

---

### Task 3.2: 个人中心完善

**目标:** 头像上传、个人资料修改、主题/语言偏好设置。

**修改文件:**
- `apps/user-service/src/modules/user/user.controller.ts` — 添加个人中心接口

---

- [ ] **Step 1: 添加个人中心接口**

```typescript
// 在 UserController 中添加
@Get('me/profile')
@ApiOperation({ summary: '获取当前用户个人资料' })
async getMyProfile(@Req() req: any) {
  const userId = req.user.id;
  return this.userService.findById(userId);
}

@Post('me/profile')
@ApiOperation({ summary: '更新个人资料' })
async updateMyProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
  const userId = req.user.id;
  return this.userService.update(userId, {
    realName: dto.realName,
    nickName: dto.nickName,
    email: dto.email,
    phone: dto.phone,
    gender: dto.gender,
    birthday: dto.birthday ? new Date(dto.birthday) : undefined,
  });
}

@Post('me/avatar')
@ApiOperation({ summary: '上传头像' })
@UseInterceptors(FileInterceptor('file', {
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.match(/^image\/(jpg|jpeg|png|gif)$/)) {
      return callback(new Error('只支持 jpg, jpeg, png, gif 格式'), false);
    }
    callback(null, true);
  },
}))
async uploadAvatar(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
  const userId = req.user.id;
  // 调用 FileService 保存文件
  const fileResult = await this.fileService.upload(file, userId);
  
  // 更新用户头像
  await this.userService.update(userId, { avatar: fileResult.url });
  
  return { url: fileResult.url };
}
```

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "feat: 完善个人中心功能（头像上传、资料修改）"
```

---

## Phase 4: 高级功能（第三方登录 + API 限流）

### Task 4.1: 第三方登录模块

**目标:** 支持 GitHub、微信 OAuth2 登录。

**新建文件:**
- `apps/user-service/src/modules/oauth/oauth.module.ts`
- `apps/user-service/src/modules/oauth/oauth.service.ts`
- `apps/user-service/src/modules/oauth/oauth.controller.ts`
- `apps/user-service/src/modules/oauth/strategies/github.strategy.ts`

**依赖:** passport-oauth2, @types/passport-oauth2

---

- [ ] **Step 1: 安装依赖**

```bash
pnpm add passport-oauth2
pnpm add -D @types/passport-oauth2
```

- [ ] **Step 2: 新增 Prisma 模型**

```prisma
model UserOAuth {
  id         Int      @id @default(autoincrement())
  userId     Int      @map("user_id")
  provider   String   @db.VarChar(20) // github / wechat
  providerId String   @map("provider_id") @db.VarChar(100)
  unionId    String?  @map("union_id") @db.VarChar(100)
  accessToken String? @map("access_token") @db.VarChar(500)
  refreshToken String? @map("refresh_token") @db.VarChar(500)
  expiresAt  DateTime? @map("expires_at")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @default(now()) @updatedAt @map("updated_at")

  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerId])
  @@map("tds_user_oauths")
}
```

修改 User 模型添加关联：
```prisma
model User {
  // ... 现有字段
  oauths     UserOAuth[]
  // ... 其他关联
}
```

- [ ] **Step 3: 生成迁移并创建 OAuth Service**

```bash
pnpm db:migrate
```

```typescript
// apps/user-service/src/modules/oauth/oauth.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core';

@Injectable()
export class OAuthService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProvider(provider: string, providerId: string) {
    return this.prisma.userOAuth.findUnique({
      where: { provider_providerId: { provider, providerId } },
      include: { user: true },
    });
  }

  async bindUser(userId: number, data: {
    provider: string;
    providerId: string;
    accessToken?: string;
    refreshToken?: string;
  }) {
    return this.prisma.userOAuth.create({
      data: { ...data, userId },
    });
  }

  async unbindUser(userId: number, provider: string) {
    return this.prisma.userOAuth.deleteMany({
      where: { userId, provider },
    });
  }
}
```

- [ ] **Step 4: 创建 GitHub OAuth Controller**

```typescript
// apps/user-service/src/modules/oauth/oauth.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '@core';

@ApiTags('OAuth')
@Controller('oauth')
export class OAuthController {
  // GitHub OAuth 登录 URL
  @Get('github')
  @Public()
  @ApiOperation({ summary: 'GitHub OAuth 登录' })
  async githubAuth() {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = `${process.env.APP_URL}/api/v1/oauth/github/callback`;
    
    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email`;
    
    return { url };
  }

  @Get('github/callback')
  @Public()
  @ApiOperation({ summary: 'GitHub OAuth 回调' })
  async githubCallback(@Query('code') code: string) {
    // 1. 用 code 换 access_token
    // 2. 用 access_token 获取用户信息
    // 3. 查找或创建用户
    // 4. 生成 JWT Token
    // ...
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: 添加第三方登录模块（GitHub OAuth2）"
```

---

### Task 4.2: API 限流模块

**目标:** 基于用户/IP 的请求频率限制，防止接口滥用。

**新建文件:**
- `apps/user-service/src/modules/throttler/throttler.module.ts`
- `apps/user-service/src/modules/throttler/guards/custom-throttler.guard.ts`

**依赖:** @nestjs/throttler

---

- [ ] **Step 1: 安装依赖**

```bash
pnpm add @nestjs/throttler
```

- [ ] **Step 2: 创建自定义限流 Guard**

```typescript
// apps/user-service/src/modules/throttler/guards/custom-throttler.guard.ts
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // 优先使用用户 ID，未登录使用 IP
    return req.user?.id || req.ip;
  }

  protected async throwThrottlingException(): Promise<void> {
    throw new HttpException('请求过于频繁，请稍后重试', 429);
  }
}
```

- [ ] **Step 3: 创建 ThrottlerModule**

```typescript
// apps/user-service/src/modules/throttler/throttler.module.ts
import { Module } from '@nestjs/common';
import { ThrottlerModule as NestThrottlerModule } from '@nestjs/throttler';
import { CustomThrottlerGuard } from './guards/custom-throttler.guard';

@Module({
  imports: [
    NestThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: 60000, // 1分钟
          limit: 100, // 每分钟100次
        },
        {
          name: 'strict',
          ttl: 60000,
          limit: 10, // 每分钟10次（用于敏感接口）
        },
      ],
    }),
  ],
  providers: [CustomThrottlerGuard],
  exports: [CustomThrottlerGuard],
})
export class ThrottlerModule {}
```

- [ ] **Step 4: 注册到 Bootstrap**

在 `apps/user-service/src/bootstrap.ts` 中添加全局限流：

```typescript
import { CustomThrottlerGuard } from './modules/throttler/guards/custom-throttler.guard';

// 在全局守卫注册处添加
app.useGlobalGuards(
  new JwtGuard(reflector, redisService),
  new PermissionsGuard(reflector),
  new CustomThrottlerGuard(), // 添加限流守卫
);
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: 添加 API 限流模块"
```

---

## 汇总

### 新增模块清单

| Phase | 模块 | 文件数 | 依赖 |
|-------|------|--------|------|
| 1.1 | 图形验证码 | 3 | svg-captcha |
| 1.2 | 登录日志 | 3 | 无 |
| 1.3 | 密码策略 | 3 | 无 |
| 1.4 | 登录安全策略 | 0（复用） | 无 |
| 2.1 | 岗位管理 | 4 | 无 |
| 2.2 | 数据字典 | 4 | 无 |
| 2.3 | 参数配置 | 3 | 无 |
| 3.1 | Excel 导入导出 | 2 | xlsx |
| 3.2 | 个人中心完善 | 0（扩展） | 无 |
| 4.1 | 第三方登录 | 4 | passport-oauth2 |
| 4.2 | API 限流 | 2 | @nestjs/throttler |

### 数据库变更

新增表：
- `tds_login_logs` — 登录日志
- `tds_password_policies` — 密码策略
- `tds_password_histories` — 密码历史
- `tds_posts` — 岗位
- `tds_user_posts` — 用户岗位关联
- `tds_dict_types` — 字典类型
- `tds_dict_data` — 字典数据
- `tds_sys_configs` — 系统参数
- `tds_user_oauths` — 第三方登录绑定

扩展表：
- `tds_users` — 添加 `user_posts` 和 `oauths` 关联

---

## 验收标准

- [ ] 所有 11 个功能模块代码完成
- [ ] Prisma 迁移成功执行
- [ ] 所有新增接口通过测试脚本验证
- [ ] 原有 59 个接口仍 100% 通过
- [ ] README 更新功能列表

**预计工作量:** 6-10 天，每日 2-3 个任务
