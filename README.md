# Data Space

> 企业级 NestJS 11 Monorepo 后端脚手架 — HTTP API + 定时任务 Worker 双应用,DDD 分层,Prisma + MariaDB + Redis,JWT 双 Token + RBAC + 数据权限,Zod 驱动校验与文档。

**中文** · [English](./README_EN.md)

![Node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/license-UNLICENSED-lightgrey)

## 简介

`data-space` 是一个面向中后台业务的 NestJS Monorepo 脚手架。基础设施(数据库、缓存、文件存储、日志、权限)通过接口抽象,业务模块按 DDD 严格分层,目标是让你**专注业务、可替换基础设施、长期可维护**。

仓库内含两个可独立运行的应用:`user-service`(HTTP API)和 `worker`(定时任务)。

## 核心特性

- **NestJS 11 Monorepo** — `user-service`(HTTP API)+ `worker`(独立 Cron 进程)双应用
- **严格 DDD 分层** — Presentation / Application / Domain / Infrastructure 隔离,业务可移植
- **Prisma 7 + MariaDB** — 通过 `@prisma/adapter-mariadb` 适配
- **JWT 双 Token 认证** — Access + Refresh,Refresh Token 存 Redis,支持单点刷新
- **完整 RBAC + 数据权限** — 角色 / 接口权限 / 数据范围(本人、本部门、子部门、全部、自定义)
- **Zod 驱动校验与文档** — Schema 同时承担运行时校验 + Swagger / OpenAPI 文档
- **可插拔基础设施** — 文件存储(local / MinIO)、缓存、日志全部接口抽象
- **完善运维能力** — `/health` 健康检查、审计日志、Winston 日轮转日志

## 技术栈

| 类别 | 选型 | 版本 |
|------|------|------|
| 运行时 | Node.js | >= 20 |
| 包管理 | pnpm | >= 9 |
| 框架 | NestJS | 11.x |
| 语言 | TypeScript | 5.x |
| ORM | Prisma | 7.x |
| 数据库 | MariaDB / MySQL | >= 8 |
| 缓存 | Redis | >= 7 |
| 校验 | Zod + `@anatine/zod-openapi` | — |
| 认证 | `@nestjs/jwt` + `passport-jwt` + `bcryptjs` | — |
| 日志 | Winston + nest-winston + 日轮转 | — |

## 项目结构

```
data-space/
├── apps/
│   ├── user-service/        # HTTP API 应用
│   │   src/
│   │   ├── main.ts          # 入口
│   │   ├── bootstrap.ts     # 全局管道/守卫/拦截器/Swagger 注册
│   │   ├── app.module.ts
│   │   └── modules/         # 业务模块(见下)
│   └── worker/              # 定时任务 Worker(独立进程)
│       src/
│       ├── main.ts
│       └── modules/scheduler/
├── libs/
│   ├── core/                # 基础设施层(别名 @core)
│   │   src/{audit, cache, config, data-scope, decorators, exception,
│   │         guards, health, interceptors, logger, middleware,
│   │         pipes, prisma}/
│   └── shared/              # 纯工具库(别名 @shared,无 NestJS 依赖)
│       src/{constants, dto, enums, interfaces, utils}/
├── prisma/                  # schema.prisma + migrations + generated client
├── docs/                    # HANDBOOK.md(深度开发手册)+ 架构图
├── logs/                    # Winston 日轮转日志输出
├── uploads/                 # 本地文件存储默认目录
└── test/                    # E2E 测试
```

业务模块([apps/user-service/src/modules/](./apps/user-service/src/modules)):

```
auth · user · role · permission · api-permission · data-permission
organization · session · file · audit · task
```

## 快速开始

**前置依赖**:Node.js ≥ 20、pnpm ≥ 9、MariaDB/MySQL ≥ 8、Redis ≥ 7。

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env,至少填好 DB_* / REDIS_* / JWT_SECRET / JWT_REFRESH_SECRET

# 3. 生成 Prisma Client 并执行迁移
pnpm db:generate
pnpm db:migrate

# 4. 启动开发服务器
pnpm start:dev              # HTTP API(默认端口 3000)
pnpm start:worker:dev       # 另开终端启动 Worker
```

API 启动后访问 `http://localhost:3000/api/v1/...` 即可调用业务接口。

## 常用脚本

| 命令 | 说明 |
|------|------|
| `pnpm start:dev` | 启动 user-service(热重载) |
| `pnpm start:debug` | 启动 user-service(`--debug --watch`) |
| `pnpm start:worker:dev` | 启动 worker(热重载) |
| `pnpm build` | 构建 user-service |
| `pnpm build:worker` | 构建 worker |
| `pnpm start:prod` | 运行构建产物(`node dist/apps/user-service/main`) |
| `pnpm start:worker:prod` | 运行 worker 构建产物 |
| `pnpm db:generate` | 生成 Prisma Client |
| `pnpm db:migrate` | 创建并执行迁移(`prisma migrate dev`) |
| `pnpm db:studio` | 打开 Prisma Studio Web UI |
| `pnpm lint` | ESLint 检查 + 自动修复 |
| `pnpm format` | Prettier 格式化 |
| `pnpm test` | Jest 单元测试 |
| `pnpm test:cov` | 覆盖率报告 |
| `pnpm test:e2e` | E2E 测试 |

完整列表见 [package.json](./package.json) 的 `scripts` 字段。

## 环境变量

参见 [.env.example](./.env.example),关键变量:

| 变量 | 说明 | 示例 |
|------|------|------|
| `NODE_ENV` | 运行环境 | `development` / `production` |
| `PORT` | HTTP 端口 | `3000` |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | MariaDB 连接 | `localhost` `3306` `root` `root` `data_space` |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` / `REDIS_DB` | Redis 连接 | `localhost` `6379` |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | Access Token 配置 | 最少 16 字符 / `15m` |
| `JWT_REFRESH_SECRET` / `JWT_REFRESH_EXPIRES_IN` | Refresh Token 配置 | 最少 16 字符 / `7d` |
| `STORAGE_TYPE` | 文件存储后端 | `local` / `minio` |
| `STORAGE_LOCAL_PATH` | local 模式落盘目录 | `uploads` |
| `STORAGE_MINIO_*` | MinIO 模式配置(endpoint / port / key / secret / bucket) | — |

> 启动时会用 Zod Schema 校验环境变量,缺少必填项会立即抛错退出。

## API 文档

服务启动后,Swagger UI 由 `@nestjs/swagger` 自动生成,具体挂载路径见 [apps/user-service/src/bootstrap.ts](./apps/user-service/src/bootstrap.ts)。所有业务接口默认带版本号前缀 `/api/v1/`(NestJS URI Versioning)。

## 健康检查

| 端点 | 说明 |
|------|------|
| `GET /health` | 汇总检查(DB + Redis) |
| `GET /health/db` | MariaDB 连通性 |
| `GET /health/redis` | Redis 连通性 |

任何一项 down 时整体 `/health` 返回 HTTP 503。

## 生产部署

```bash
# 构建
pnpm install --frozen-lockfile
pnpm build
pnpm build:worker

# 启动
pnpm start:prod              # node dist/apps/user-service/main
pnpm start:worker:prod       # node dist/apps/worker/main
```

最小化部署:Nginx → user-service(可水平扩展) + worker(单实例,或多实例 + Redis 分布式锁) + MariaDB + Redis。

## 进一步阅读

- [docs/HANDBOOK.md](./docs/HANDBOOK.md) — 深度开发手册:DDD 分层原则、新模块完整开发流程(订单模块示例)、认证/权限/文件存储/审计/日志详细机制、排错指南
- [docs/permission-architecture.drawio](./docs/permission-architecture.drawio) — 权限系统架构图

## License

UNLICENSED — 私有项目。
