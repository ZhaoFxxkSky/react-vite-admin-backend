> ⚠️ **旧版开发手册存档 / Legacy Development Handbook**
>
> 本文档为 [README.md](../README.md) 的旧版完整内容。部分章节(目录路径、依赖版本、模块拆分)已与当前代码不一致,**以根目录新版 README 为准**。保留此文档作为 DDD 分层开发流程、订单模块完整示例、生产部署细节的参考。
>
> *This is the original 787-line developer handbook. Some sections (paths, versions, module list) are stale — see root [README.md](../README.md) for the current state. Kept as reference for the DDD layering workflow, complete Order-module walkthrough, and production-deployment notes.*

---

# Data Space — 企业级 NestJS Monorepo 脚手架开发手册

## 一、项目定位

本脚手架是一个**严格分层**的 NestJS Monorepo,核心设计目标:

- **业务模块完全隔离**:换 ORM、换数据库、换框架时,核心业务逻辑零改动
- **API 版本化**:所有接口天然支持 `/api/v1/`、`/api/v2/` 平滑升级
- **文档即代码**:Zod Schema 同时承担运行时校验 + Swagger 文档生成
- **基础设施可插拔**:文件存储、缓存、日志全部通过接口抽象

---

## 二、技术栈版本锁定

```
Node.js    >= 20.0.0
pnpm       >= 9.0.0
MySQL      >= 8.0
Redis      >= 7.0
NestJS     10.x
Prisma     6.x
TypeScript 5.x
```

---

## 三、Monorepo 结构详解

```
data-space/
├── apps/
│   ├── api/
│   │   src/
│   │   ├── main.ts              # API 入口:NestFactory.create()
│   │   ├── bootstrap.ts         # 全局管道/守卫/拦截器/Swagger/版本化注册
│   │   ├── app.module.ts        # 根模块:导入所有业务模块 + Core 模块
│   │   └── modules/             # === 所有业务模块必须放这里 ===
│   │       ├── auth/            # 认证模块(登录/注册/刷新Token)
│   │       ├── user/            # 用户模块(完整的 DDD 示例)
│   │       ├── rbac/            # 权限模块(角色/权限管理)
│   │       ├── file/            # 文件模块(上传/下载/生命周期)
│   │       └── task/            # 定时任务(已迁移到 Worker,此处保留接口)
│   └── worker/
│       src/
│       ├── main.ts              # Worker 入口:createApplicationContext
│       ├── app.module.ts        # Worker 根模块
│       └── modules/scheduler/   # 定时任务实际执行处
├── libs/
│   ├── core/                    # 基础设施层(@core 路径别名)
│   │   src/
│   │   ├── prisma/              # Prisma Client、数据权限中间件
│   │   ├── cache/               # RedisService、RedisLockService
│   │   ├── logger/              # Winston 配置(JSON + 日轮转)
│   │   ├── config/              # Zod Schema 环境变量校验
│   │   ├── guards/              # JwtGuard(双Token)、PermissionsGuard
│   │   ├── interceptors/        # TransformInterceptor、LoggingInterceptor
│   │   ├── health/              # /health /health/db /health/redis
│   │   ├── audit/               # 自动审计日志拦截器
│   │   ├── exception/           # GlobalExceptionFilter
│   │   └── pipes/               # ZodValidationPipe
│   └── shared/                  # 纯工具库(@shared 路径别名,无 NestJS 依赖)
│       src/
│       ├── enums/               # UserStatus 等业务枚举
│       ├── utils/               # hashPassword、comparePassword
│       ├── constants/           # REFRESH_TOKEN_PREFIX 等常量
│       └── interfaces/          # 通用接口
├── prisma/                      # Prisma Schema + 迁移文件
│   ├── schema.prisma            # 数据库模型定义
│   └── migrations/              # 生成的迁移 SQL 文件
├── logs/                        # Winston 日志输出(application-*.log / error-*.log)
├── .env                         # 环境变量(不提交 Git)
├── .env.example                 # 环境变量模板
└── tsconfig.json                # paths: @core → libs/core/src, @shared → libs/shared/src
```

### 3.1 绝对不能违反的目录规则

| 放哪里 | 不能放什么 | 后果 |
|--------|-----------|------|
| `apps/api/src/modules/` | — | 业务 Controller、Service、Domain |
| `libs/core/src/` | Controller、Service、业务 Entity | 基础设施:DB、Redis、日志、守卫 |
| `libs/shared/src/` | NestJS 装饰器、Injectable | 纯函数、常量、枚举、工具类 |

**反例**:如果把 `UserController` 放到 `libs/core/src/user/user.controller.ts`,会破坏 `libs/` 作为纯基础设施的定位,导致其他应用(Worker)被迫引入 HTTP 依赖。

---

## 四、从零开发一个新模块(完整步骤)

以开发一个 **订单模块(order)** 为例,完整走一遍所有步骤。

### 步骤 1:定义数据库 Schema

在 `prisma/schema.prisma` 中添加 `Order` 模型:

```prisma
model Order {
  id          Int      @id @default(autoincrement())
  userId      Int      @map("user_id")
  productName String   @map("product_name") @db.VarChar(100)
  quantity    Int
  totalPrice  Int      @map("total_price")
  status      String   @default("pending") @db.VarChar(20)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  user        User     @relation(fields: [userId], references: [id])

  @@map("orders")
}
```

然后执行:

```bash
pnpm db:generate   # 生成 Prisma Client
pnpm db:migrate    # 创建并执行迁移
```

开发阶段也可以用 `pnpm db:push` 直接同步 schema(不生成迁移文件)。

### 步骤 2:创建 Domain 层

```
apps/api/src/modules/order/
├── domain/
│   ├── entities/
│   │   └── order.entity.ts
│   └── repositories/
│       └── order.repository.interface.ts
```

**order.entity.ts**

```typescript
export class OrderEntity {
  id!: number;
  userId!: number;
  productName!: string;
  quantity!: number;
  totalPrice!: number;
  status!: string;
  createdAt!: Date;

  constructor(partial: Partial<OrderEntity>) {
    Object.assign(this, partial);
  }

  markAsPaid(): void {
    this.status = 'paid';
  }

  calculateTotal(unitPrice: number): void {
    this.totalPrice = unitPrice * this.quantity;
  }
}
```

**order.repository.interface.ts**

```typescript
import { OrderEntity } from '../entities/order.entity';

export interface IOrderRepository {
  findById(id: number): Promise<OrderEntity | null>;
  findByUserId(userId: number, page: number, limit: number): Promise<OrderEntity[]>;
  save(entity: OrderEntity): Promise<OrderEntity>;
  updateStatus(id: number, status: string): Promise<void>;
}
```

### 步骤 3:创建 Infrastructure 层

```
apps/api/src/modules/order/
└── infrastructure/
    ├── repositories/
    │   └── order.repository.ts
    ├── mappers/
    │   └── order.mapper.ts
    └── persistence/
        └── order.persistence.module.ts
```

**order.mapper.ts**

```typescript
import { Order } from '@prisma/client';
import { OrderEntity } from '../../domain/entities/order.entity';

export class OrderMapper {
  static toDomain(row: Order): OrderEntity {
    return new OrderEntity({
      id: row.id,
      userId: row.userId,
      productName: row.productName,
      quantity: row.quantity,
      totalPrice: row.totalPrice,
      status: row.status,
      createdAt: row.createdAt,
    });
  }

  static toPersistence(entity: OrderEntity) {
    return {
      userId: entity.userId,
      productName: entity.productName,
      quantity: entity.quantity,
      totalPrice: entity.totalPrice,
      status: entity.status,
    };
  }
}
```

**order.repository.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core';
import { IOrderRepository } from '../../domain/repositories/order.repository.interface';
import { OrderEntity } from '../../domain/entities/order.entity';
import { OrderMapper } from '../mappers/order.mapper';

@Injectable()
export class OrderRepository implements IOrderRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: number): Promise<OrderEntity | null> {
    const row = await this.prisma.order.findUnique({ where: { id } });
    return row ? OrderMapper.toDomain(row) : null;
  }

  async findByUserId(userId: number, page = 1, limit = 10): Promise<OrderEntity[]> {
    const skip = (page - 1) * limit;
    const rows = await this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    });
    return rows.map(OrderMapper.toDomain);
  }

  async save(entity: OrderEntity): Promise<OrderEntity> {
    const created = await this.prisma.order.create({
      data: OrderMapper.toPersistence(entity),
    });
    return OrderMapper.toDomain(created);
  }

  async updateStatus(id: number, status: string): Promise<void> {
    await this.prisma.order.update({ where: { id }, data: { status } });
  }
}
```

**order.persistence.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { OrderRepository } from './repositories/order.repository';

@Module({
  providers: [{ provide: 'IOrderRepository', useClass: OrderRepository }],
  exports: ['IOrderRepository'],
})
export class OrderPersistenceModule {}
```

### 步骤 4:创建 Application 层(Service)

```
apps/api/src/modules/order/
└── application/
    └── services/
        └── order.service.ts
```

```typescript
import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IOrderRepository } from '../../domain/repositories/order.repository.interface';
import { OrderEntity } from '../../domain/entities/order.entity';

@Injectable()
export class OrderService {
  constructor(
    @Inject('IOrderRepository') private orderRepo: IOrderRepository,
  ) {}

  async create(userId: number, productName: string, quantity: number, unitPrice: number) {
    const entity = new OrderEntity({
      userId,
      productName,
      quantity,
    });
    entity.calculateTotal(unitPrice);
    return this.orderRepo.save(entity);
  }

  async findByUser(userId: number, page: number, limit: number) {
    return this.orderRepo.findByUserId(userId, page, limit);
  }

  async pay(id: number, userId: number) {
    const order = await this.orderRepo.findById(id);
    if (!order || order.userId !== userId) {
      throw new NotFoundException('Order not found');
    }
    order.markAsPaid();
    await this.orderRepo.updateStatus(id, order.status);
    return order;
  }
}
```

**关键**:Service 里不出现任何 `@prisma/client` 的 import,所有数据操作通过 `IOrderRepository` 接口完成。

### 步骤 5:创建 Presentation 层(Controller + DTO)

```
apps/api/src/modules/order/
└── presentation/
    ├── order.controller.ts
    └── dto/
        └── create-order.dto.ts
```

**create-order.dto.ts**

```typescript
import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';

export const createOrderSchema = extendApi(
  z.object({
    productName: extendApi(z.string().min(1).max(100), {
      description: '商品名称',
      example: 'iPhone 15',
    }),
    quantity: extendApi(z.number().int().min(1), {
      description: '数量',
      example: 2,
    }),
    unitPrice: extendApi(z.number().int().min(1), {
      description: '单价(分)',
      example: 599900,
    }),
  }),
  { title: 'CreateOrderDto', description: '创建订单' },
);

export type CreateOrderDto = z.infer<typeof createOrderSchema>;
```

**order.controller.ts**

```typescript
import { Controller, Post, Get, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrderService } from '../application/services/order.service';
import { CurrentUser, ZodValidationPipe, Permissions } from '@core';
import { createOrderSchema, CreateOrderDto } from './dto/create-order.dto';

@ApiTags('Order')
@ApiBearerAuth()
@Controller({ path: 'orders', version: '1' })
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @Permissions('order:create')
  @ApiOperation({ summary: '创建订单' })
  create(
    @Body(new ZodValidationPipe(createOrderSchema)) dto: CreateOrderDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.orderService.create(userId, dto.productName, dto.quantity, dto.unitPrice);
  }

  @Get()
  @Permissions('order:read')
  @ApiOperation({ summary: '我的订单列表' })
  findMyOrders(
    @CurrentUser('id') userId: number,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.orderService.findByUser(userId, Number(page), Number(limit));
  }

  @Post(':id/pay')
  @Permissions('order:update')
  @ApiOperation({ summary: '支付订单' })
  pay(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.orderService.pay(id, userId);
  }
}
```

### 步骤 6:组装 Module

```typescript
// apps/api/src/modules/order/order.module.ts
import { Module } from '@nestjs/common';
import { OrderController } from './presentation/order.controller';
import { OrderService } from './application/services/order.service';
import { OrderPersistenceModule } from './infrastructure/persistence/order.persistence.module';

@Module({
  imports: [OrderPersistenceModule],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}
```

### 步骤 7:注册到根模块

```typescript
// apps/api/src/app.module.ts
import { OrderModule } from './modules/order/order.module';

@Module({
  imports: [
    // ...existing
    OrderModule,
  ],
})
export class AppModule {}
```

完成。此时 Swagger 文档会自动显示 Order 模块的接口和字段定义。

---

## 五、DDD 分层核心原则(必须遵守)

### 5.1 分层依赖方向

```
Presentation (Controller)  →  Application (Service)  →  Domain (Entity/Interface)  ←  Infrastructure (Repository)
```

- **上层可以调用下层**
- **Domain 层不依赖任何其他层**
- **Infrastructure 实现 Domain 定义的接口**

### 5.2 各层职责

| 层级 | 文件位置 | 职责 | 禁止做的事 |
|------|---------|------|-----------|
| Presentation | `presentation/*.controller.ts` | 接收 HTTP 请求,解析参数,调用 Service | 不写业务逻辑、不直接调 Repository |
| Application | `application/services/*.service.ts` | 编排业务逻辑,调用 Repository,处理事务 | 不写 SQL、不 import `@prisma/client` |
| Domain | `domain/entities/*.entity.ts` | 纯业务实体,包含业务规则方法(如 `markAsPaid`) | 不出现框架代码(NestJS、Prisma) |
| Domain | `domain/repositories/*.repository.interface.ts` | 定义仓储契约 | 不出现实现细节 |
| Infrastructure | `infrastructure/repositories/*.repository.ts` | Prisma ORM 实现,唯一接触 SQL 的地方 | 不写业务逻辑、不直接返回给 Controller |
| Infrastructure | `infrastructure/mappers/*.mapper.ts` | Prisma Row <-> Domain Entity 转换 | 不出现业务判断 |

---

## 六、认证与权限系统

### 6.1 双 Token 流程

```
登录(/api/v1/auth/login)
    → 返回 { accessToken, refreshToken }
    → refreshToken 存入 Redis,key: refresh:{uuid}

请求受保护接口
    → Header: Authorization: Bearer {accessToken}
    → JwtGuard 校验 Access Token

Access Token 过期
    → POST /api/v1/auth/refresh
    → 携带 refreshToken
    → 校验 Redis 中是否存在
    → 生成新的 accessToken + refreshToken
    → 旧 refreshToken 从 Redis 删除(单点刷新)
```

### 6.2 RBAC 权限模型

```
users 表  ←→  user_roles 表  ←→  roles 表
                            ←→  role_permissions 表  ←→  permissions 表
```

使用方式:

```typescript
@Controller('orders')
export class OrderController {
  @Post()
  @Permissions('order:create')    // 需要此权限
  create() {}

  @Get()
  @Public()                       // 跳过鉴权
  list() {}
}
```

权限字符串命名规范:`{resource}:{action}`,如 `user:create`、`order:delete`、`role:manage`。

### 6.3 数据权限

在 `@Permissions` 上声明的权限码会自动关联 `DataPermissionMeta` 元数据,通过 `DataScopeInterceptor` 读取当前用户的角色数据权限配置,在 Prisma Client Extension 中自动注入 `where` 条件。

数据权限范围:

| 范围 | 说明 |
|------|------|
| ALL | 全部数据(超管默认) |
| ORG_AND_CHILD | 本部门及所有子部门 |
| ORG | 本部门数据 |
| SELF | 仅本人数据 |
| CUSTOM | 自定义部门 |
| NONE | 无数据权限 |

---

## 七、文件存储系统

通过环境变量 `STORAGE_TYPE` 切换:

```env
STORAGE_TYPE=local       # 本地磁盘
STORAGE_TYPE=minio       # MinIO 对象存储
```

### 7.1 新增存储后端

实现 `IStorageProvider` 接口即可:

```typescript
// apps/api/src/modules/file/storage/oss.storage.ts
import { Injectable } from '@nestjs/common';
import { IStorageProvider, StorageFile, StorageResult } from './storage.interface';

@Injectable()
export class OssStorageProvider implements IStorageProvider {
  async upload(file: StorageFile): Promise<StorageResult> {
    // 实现阿里云 OSS 上传
  }

  async delete(fileName: string): Promise<void> {
    // 实现删除
  }
}
```

然后在 `file.module.ts` 中注入,在 `file.service.ts` 中根据配置切换即可。

---

## 八、Worker 与定时任务

### 8.1 架构设计

- **API 应用** (`apps/api`):不运行任何 Cron 任务
- **Worker 应用** (`apps/worker`):独立进程运行所有定时任务

### 8.2 新增定时任务

在 `apps/worker/src/modules/scheduler/` 下添加 Service:

```typescript
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisService } from '@core';

@Injectable()
export class SchedulerService {
  constructor(private redis: RedisService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredTokens() {
    // 使用 Redis 分布式锁防止多实例重复执行
    const lock = await this.redis.getClient().set(
      'lock:cleanup-tokens',
      '1',
      'EX',
      300,
      'NX',
    );
    if (!lock) return; // 其他实例正在执行

    try {
      // 执行任务...
    } finally {
      await this.redis.getClient().del('lock:cleanup-tokens');
    }
  }
}
```

---

## 九、健康检查

内置端点:

```
GET /health          → 汇总所有指标
GET /health/db       → MySQL 连通性
GET /health/redis    → Redis 连通性
```

如果数据库断开,`/health/db` 返回 `status: 'down'`,整体 `/health` 返回 HTTP 503。

---

## 十、审计日志

所有非 `GET` 请求自动记录到 `audit_logs` 表:

| 字段 | 说明 |
|------|------|
| user_id | 操作用户 ID |
| action | `POST /api/v1/orders` |
| resource | `order` |
| ip | 客户端 IP |
| user_agent | 浏览器 UA |
| created_at | 时间 |

写入是异步的(不阻塞请求响应)。

---

## 十一、日志系统

Winston 按日轮转,JSON 格式输出,字段包括 `timestamp`、`level`、`message`、`requestId`、`trace`。

```typescript
// 在 Service 中使用
import { Logger } from '@nestjs/common';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  async create(...) {
    this.logger.log('Creating order for user:', userId);
  }
}
```

日志文件:
- `logs/application-2024-01-15.log` — 全量日志
- `logs/error-2024-01-15.log` — 仅 Error 级别
- 保留 14 天,超过 20MB 自动压缩

---

## 十二、环境变量校验机制

启动时会执行 Zod Schema 校验,**缺少必填项会直接抛错退出**。

例如:

```typescript
// libs/core/src/config/jwt.config.ts
export const jwtConfigSchema = z.object({
  JWT_SECRET: z.string().min(16),      // 必填,最少16字符
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
});
```

如果 `.env` 中缺少 `JWT_SECRET`,启动时会报错:

```
Invalid environment variables: JWT_SECRET: Required
```

---

## 十三、常用命令速查

```bash
# === 开发 ===
pnpm start:dev              # 启动 API(热重载)
pnpm start:worker:dev       # 启动 Worker(热重载)
pnpm start:debug            # 调试模式(--debug --watch)

# === 构建 ===
pnpm build                  # 构建 API
pnpm build:worker           # 构建 Worker

# === 数据库 ===
pnpm db:generate            # 根据 Schema 生成 Prisma Client
pnpm db:migrate             # 创建并执行迁移
pnpm db:push                # 直接推送 Schema(开发快速迭代,不生成 SQL)
pnpm db:studio              # 打开 Prisma Studio(Web UI 管理数据)
pnpm db:seed                # 执行种子脚本(创建 admin 账号等)

# === 代码质量 ===
pnpm lint                   # ESLint 检查 + 自动修复
pnpm format                 # Prettier 格式化
pnpm test                   # Jest 单元测试
pnpm test:e2e               # E2E 测试
```

---

## 十四、生产部署

### 14.1 构建

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm build:worker
```

### 14.2 启动

```bash
# API
node dist/apps/api/apps/api/src/main

# Worker
node dist/apps/worker/src/main
```

### 14.3 最小化部署架构

```
┌─────────────┐     ┌─────────────┐
│   Nginx     │────▶│  API (xN)   │
│  负载均衡    │     │  :3000      │
└─────────────┘     └─────────────┘
                           │
     ┌─────────────────────┼─────────────────────┐
     ▼                     ▼                     ▼
┌─────────┐          ┌─────────┐          ┌─────────┐
│  MySQL  │          │  Redis  │          │  Worker │
│  :3306  │          │  :6379  │          │ (Cron)  │
└─────────┘          └─────────┘          └─────────┘
```

### 14.4 日志收集

生产环境建议用 Filebeat 或 Fluentd 采集 `logs/*.log` 中的 JSON 日志,发送到 ELK / Loki。

---

## 十五、排错指南

### Q: 启动时报 `Cannot find module 'bcrypt_lib.node'`

**原因**:bcrypt 是 C++ 原生模块,Windows 编译容易失败。
**解决**:已更换为 `bcryptjs`(纯 JavaScript),无需编译。如果仍有残留,执行 `pnpm rebuild`。

### Q: Swagger 中 DTO 显示为空对象

**原因**:没有使用 `extendApi()` 给 Zod Schema 添加 OpenAPI 元数据。
**解决**:所有 DTO 必须使用 `extendApi(z.object({...}), { title: '...' })` 包裹。

### Q: 数据库迁移后字段不生效

**原因**:Prisma 的 `db:push` 不会删除列,只添加新列。
**解决**:开发阶段用 `db:push`,生产环境必须用 `db:migrate` 生成并执行迁移文件。

### Q: 定时任务在多个实例中重复执行

**原因**:未使用分布式锁。
**解决**:Worker 中的 Cron 任务必须通过 Redis `SET key value EX seconds NX` 获取锁。

---

## 十六、扩展预留(未实现)

| 特性 | 建议方案 |
|------|---------|
| 指标监控 | `prom-client` + `/metrics` 端点 |
| 链路追踪 | OpenTelemetry + Jaeger |
| 消息队列 | BullMQ + Redis |
| 实时推送 | `@nestjs/websockets` 或 SSE |
| 批量导入导出 | `xlsx` / `papaparse` |
