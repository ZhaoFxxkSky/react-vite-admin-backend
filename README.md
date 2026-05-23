# Data Space

<p align="center">
  <a href="https://github.com/ZhaoFxxkSky/react-vite-admin-backend">
    <img src="https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white" alt="Node.js">
    <img src="https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white" alt="NestJS">
    <img src="https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white" alt="Prisma">
    <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
  </a>
</p>

> **GitHub**: [https://github.com/ZhaoFxxkSky/react-vite-admin-backend](https://github.com/ZhaoFxxkSky/react-vite-admin-backend)

**中文** · [English](./README_EN.md)

Data Space 是一套面向中后台业务的 NestJS 11 Monorepo 后端开发模板，包含 HTTP API 服务和定时任务 Worker 两个可独立运行的应用。采用 DDD 四层架构（Presentation / Application / Domain / Infrastructure），基础设施通过接口抽象实现可替换性，目标是让开发者专注业务逻辑，同时保证系统长期可维护。

仓库目前包含两个应用：
- **user-service**: HTTP API 服务，提供完整的用户管理、权限控制、组织架构等 RESTful 接口
- **worker**: 独立的定时任务调度进程，用于处理后台异步任务

## 目录

- [核心特性](#核心特性)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [环境变量](#环境变量)
- [功能模块](#功能模块)
- [权限体系](#权限体系)
- [接口文档](#接口文档)
- [生产部署](#生产部署)
- [开发文档](#开发文档)

## 核心特性

### DDD 分层架构

所有业务模块按四层架构实现：
- **Presentation**: Controller 层，负责 HTTP 请求处理和响应格式化
- **Application**: Service 层，编排领域对象完成业务用例
- **Domain**: 实体、值对象、仓储接口、领域服务，不依赖任何外部框架
- **Infrastructure**: 仓储实现、外部服务接入，通过依赖注入替换

这种分层使得业务逻辑不依赖具体基础设施，数据库、缓存、文件存储等均可替换。

### 完整的 RBAC 权限体系

- **角色管理**: 支持角色的增删改查，以及角色与权限、用户的绑定关系
- **菜单权限**: 基于权限树的菜单控制，支持前端动态路由
- **接口权限**: 自动扫描 Controller 装饰器生成 API 权限元数据，支持接口级别的访问控制
- **数据权限**: 支持五种数据范围（本人、本部门、子部门、全部、自定义），通过 Prisma Client 扩展实现自动数据过滤

### JWT 双 Token 认证

- **Access Token**: 短时效（默认 15 分钟），用于 API 请求认证
- **Refresh Token**: 长时效（默认 7 天），存储在 Redis，用于获取新的 Access Token
- **Token 黑名单**: 支持强制下线特定会话，被踢出的 Token 会进入 Redis 黑名单
- **多端登录控制**: 同一用户可在多个设备登录，支持查看所有在线会话并强制下线

### Zod 驱动校验

所有接口的 DTO 使用 Zod Schema 定义，一份 Schema 同时承担：
- 运行时请求参数校验
- Swagger / OpenAPI 文档生成（通过 `@anatine/zod-openapi`）
- TypeScript 类型推断

### 可插拔基础设施

通过接口抽象，以下组件可替换实现：
- **文件存储**: 支持本地磁盘和 MinIO 对象存储
- **日志**: Winston + 日轮转，支持按日期切割日志文件
- **缓存**: Redis 缓存抽象

### 审计日志

通过 NestJS 拦截器自动记录所有操作日志，包含：
- 操作人、操作时间、IP 地址
- 请求参数和响应结果
- 操作耗时

日志支持通过 HTTP 接口保存，也可直接写入数据库。

## 技术栈

| 类别 | 选型 | 说明 |
|------|------|------|
| 运行时 | Node.js >= 20 | 支持 ES2023 特性 |
| 包管理 | pnpm >= 9 | Monorepo 工作区管理 |
| 框架 | NestJS 11 | 模块化、依赖注入、装饰器驱动 |
| 语言 | TypeScript 5 | 严格类型检查 |
| ORM | Prisma 7 | 类型安全的数据库操作，支持 MariaDB 适配器 |
| 数据库 | MariaDB / MySQL >= 8 | 关系型数据存储 |
| 缓存 | Redis >= 7 | 会话缓存、Token 黑名单、分布式锁 |
| 校验 | Zod + `@anatine/zod-openapi` | Schema 同时承担校验和文档生成 |
| 认证 | `@nestjs/jwt` + `passport-jwt` + `bcryptjs` | JWT 双 Token + 密码加密 |
| 日志 | Winston + `nest-winston` | 结构化日志 + 日轮转 |
| 文档 | `@nestjs/swagger` | 自动生成 Swagger UI |
| 健康检查 | `@nestjs/terminus` | 数据库、Redis 连通性检查 |

## 项目结构

```
data-space/
├── apps/
│   ├── user-service/                 # HTTP API 应用
│   │   src/
│   │   ├── main.ts                   # 应用入口
│   │   ├── bootstrap.ts              # 全局管道、守卫、拦截器、Swagger 注册
│   │   ├── app.module.ts             # 根模块
│   │   └── modules/                  # 业务模块
│   │       ├── auth/                 # 认证模块（登录、登出、Token 刷新）
│   │       ├── user/                 # 用户模块（CRUD、密码、状态）
│   │       ├── role/                 # 角色模块（CRUD、权限绑定）
│   │       ├── permission/           # 权限模块（菜单、按钮权限树）
│   │       ├── api-permission/       # 接口权限模块（扫描、启停控制）
│   │       ├── data-permission/      # 数据权限模块（范围配置）
│   │       ├── organization/         # 组织架构模块（部门树）
│   │       ├── session/              # 会话模块（在线管理、强制下线）
│   │       ├── file/                 # 文件模块（上传、下载、管理）
│   │       ├── audit/                # 审计模块（操作日志）
│   │       └── task/                 # 任务模块（预留）
│   └── worker/                       # 定时任务 Worker 应用
│       src/
│       ├── main.ts                   # Worker 入口
│       └── modules/scheduler/        # 定时任务调度器
├── libs/
│   ├── core/                         # 核心基础设施库（别名 @core）
│   │   src/
│   │   ├── prisma/                   # Prisma Client 封装和扩展
│   │   ├── guards/                   # JWT 守卫、权限守卫
│   │   ├── interceptors/             # 数据范围拦截器、响应转换拦截器
│   │   ├── decorators/               # 自定义装饰器（Public、ApiPermission）
│   │   ├── exception/                # 全局异常过滤器
│   │   ├── logger/                   # Winston 日志配置
│   │   ├── cache/                    # Redis 缓存服务
│   │   ├── config/                   # 配置文件加载（YAML + Zod 校验）
│   │   ├── data-scope/               # 数据权限工具
│   │   ├── health/                   # 健康检查
│   │   └── audit/                    # 审计日志接口
│   ├── shared/                       # 纯工具库（别名 @shared）
│   │   src/
│   │   ├── constants/                # 常量定义
│   │   ├── enums/                    # 枚举类型
│   │   ├── interfaces/               # TypeScript 接口
│   │   ├── utils/                    # 工具函数
│   │   └── dto/                      # 通用 DTO
│   └── user-platform/                # 用户平台共享库（别名 @app/user-platform）
│       src/
│       ├── guards/                   # 平台级权限守卫
│       ├── interceptors/             # 平台级拦截器
│       ├── decorators/               # 平台级装饰器
│       ├── prisma/                   # 扩展 Prisma Client（数据权限中间件）
│       └── utils/                    # 平台工具函数
├── prisma/
│   ├── schema.prisma                 # Prisma Schema 定义
│   ├── migrations/                   # 数据库迁移文件
│   └── prisma.config.ts              # Prisma 配置（数据源、日志）
├── docs/
│   ├── HANDBOOK.md                   # 深度开发手册
│   └── permission-architecture.drawio # 权限架构图
├── logs/                             # 日轮转日志输出目录
├── uploads/                          # 本地文件存储目录
└── test/                             # E2E 测试
```

## 快速开始

### 环境要求

- Node.js >= 20
- pnpm >= 9
- MariaDB / MySQL >= 8
- Redis >= 7

### 安装

```bash
# 1. 克隆仓库
git clone https://github.com/ZhaoFxxkSky/react-vite-admin-backend.git
cd react-vite-admin-backend

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，至少配置以下项：
# - DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
# - REDIS_HOST, REDIS_PORT
# - JWT_SECRET（至少 16 字符）
# - JWT_REFRESH_SECRET（至少 16 字符）

# 4. 生成 Prisma Client 并执行数据库迁移
pnpm db:generate
pnpm db:migrate

# 5. 启动开发服务器
pnpm start:dev
```

### 启动 Worker（另开终端）

```bash
pnpm start:worker:dev
```

### 验证启动

- **API 服务**: `http://localhost:3000`
- **Swagger 文档**: `http://localhost:3000/docs`
- **健康检查**: `http://localhost:3000/health`

## 环境变量

启动时通过 Zod Schema 校验环境变量，缺少必填项会立即报错退出。

| 变量 | 必填 | 说明 | 示例 |
|------|------|------|------|
| `NODE_ENV` | 是 | 运行环境 | `development` / `production` |
| `PORT` | 否 | HTTP 端口 | `3000` |
| `DB_HOST` | 是 | 数据库地址 | `localhost` |
| `DB_PORT` | 是 | 数据库端口 | `3306` |
| `DB_USER` | 是 | 数据库用户名 | `root` |
| `DB_PASSWORD` | 是 | 数据库密码 | - |
| `DB_NAME` | 是 | 数据库名 | `data_space` |
| `REDIS_HOST` | 是 | Redis 地址 | `localhost` |
| `REDIS_PORT` | 是 | Redis 端口 | `6379` |
| `REDIS_PASSWORD` | 否 | Redis 密码 | - |
| `REDIS_DB` | 否 | Redis 数据库索引 | `0` |
| `JWT_SECRET` | 是 | Access Token 密钥 | 最少 16 字符 |
| `JWT_EXPIRES_IN` | 否 | Access Token 有效期 | `15m` |
| `JWT_REFRESH_SECRET` | 是 | Refresh Token 密钥 | 最少 16 字符 |
| `JWT_REFRESH_EXPIRES_IN` | 否 | Refresh Token 有效期 | `7d` |
| `STORAGE_TYPE` | 否 | 文件存储类型 | `local` / `minio` |
| `STORAGE_LOCAL_PATH` | 否 | 本地存储路径 | `uploads` |
| `STORAGE_MINIO_ENDPOINT` | 条件 | MinIO 地址 | `localhost` |
| `STORAGE_MINIO_PORT` | 条件 | MinIO 端口 | `9000` |
| `STORAGE_MINIO_ACCESS_KEY` | 条件 | MinIO Access Key | - |
| `STORAGE_MINIO_SECRET_KEY` | 条件 | MinIO Secret Key | - |
| `STORAGE_MINIO_BUCKET` | 条件 | MinIO Bucket | `data-space` |

## 功能模块

### 认证模块 (`/auth`)

- 用户名密码登录
- 双 Token 发放（Access + Refresh）
- Token 刷新
- 登出（将当前 Token 加入黑名单）

### 用户模块 (`/users`)

- 用户 CRUD（分页查询、详情、创建、更新、删除）
- 密码重置（管理员可重置任意用户密码）
- 状态管理（启用 / 禁用 / 锁定 / 解锁）
- 角色绑定（为用户分配角色）
- 个人信息管理（修改个人信息、修改密码）

### 角色模块 (`/roles`)

- 角色 CRUD
- 权限绑定（为角色分配菜单权限和接口权限）
- 用户分配（批量为角色添加 / 移除用户）

### 权限模块 (`/permissions`)

- 权限树查询（菜单 + 按钮权限）
- 权限 CRUD
- 获取当前用户菜单（根据角色过滤）
- 获取当前用户权限编码列表

### 接口权限模块 (`/api-permissions`)

- 自动扫描所有 Controller 生成接口权限元数据
- 接口权限树查询
- 启停控制（单个 / 批量）
- 清理失效接口（物理删除已不存在的接口）

### 数据权限模块 (`/data-permissions`)

- 数据权限元数据查询（支持的数据范围类型）
- 为角色配置数据权限范围
- 支持五种范围：本人、本部门、子部门、全部、自定义

### 组织架构模块 (`/organizations`)

- 组织树查询（部门 / 公司层级）
- 组织 CRUD
- 成员查询（查询某组织下的用户列表）

### 会话模块 (`/sessions`)

- 在线会话分页查询
- 在线用户详情（某用户的所有会话）
- 强制下线（按 userId 或 refreshToken）
- 查询当前用户所有会话
- 退出所有设备（包括当前会话）

### 文件模块 (`/files`)

- 文件上传（支持本地和 MinIO 存储）
- 文件下载
- 文件列表查询
- 文件删除

### 审计模块 (`/audit`)

- 保存审计日志（HTTP 接口）
- 审计日志列表查询
- 支持按时间、用户、模块筛选

## 权限体系

本项目实现了三层权限控制：

### 1. 菜单权限（前端）

- 用户登录后返回菜单树，前端根据菜单渲染侧边栏
- 按钮级权限通过权限编码控制（如 `system:user:create`）

### 2. 接口权限（后端）

- 每个 Controller 方法通过 `@ApiPermission()` 装饰器声明所需权限
- `PermissionsGuard` 拦截请求，校验用户是否具备该接口权限
- 超级管理员（`isSuperAdmin=true`）跳过权限校验

### 3. 数据权限（数据库层）

- 通过 Prisma Client 扩展实现数据权限中间件
- 自动在查询 SQL 中追加数据范围条件
- 五种数据范围：
  - **本人**: 只能看自己的数据
  - **本部门**: 只能看本部门的数据
  - **子部门**: 能看本部门及所有子部门的数据
  - **全部**: 能看所有数据
  - **自定义**: 按配置的规则过滤

## 接口文档

服务启动后，Swagger UI 自动生成，访问路径：`http://localhost:3000/docs`

所有业务接口默认带版本号前缀 `/api/v1/`。

### 测试接口可用性

项目包含完整的接口测试脚本，覆盖 59 个 API 接口：

```bash
# 在临时目录运行测试
node /tmp/test-api.js
```

测试脚本会：
1. 使用 admin 账号登录获取 Token
2. 测试所有模块的接口
3. 输出测试报告（通过 / 失败 / 响应状态码）

## 生产部署

### 构建

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm build:worker
```

### 启动

```bash
# 启动 API 服务
pnpm start:prod

# 启动 Worker（另开终端）
pnpm start:worker:prod
```

### 推荐部署架构

```
Nginx (反向代理 + 负载均衡)
    ├── user-service (多实例，水平扩展)
    └── worker (单实例，或 多实例 + Redis 分布式锁)

MariaDB (主从 / 集群)
Redis (缓存 + Session + 分布式锁)
```

### Docker 部署（可选）

```bash
# 构建镜像
docker build -t data-space-api .
docker build -t data-space-worker -f Dockerfile.worker .

# 运行
docker run -d --name data-space-api -p 3000:3000 --env-file .env data-space-api
docker run -d --name data-space-worker --env-file .env data-space-worker
```

## 开发文档

- [docs/HANDBOOK.md](./docs/HANDBOOK.md) — 深度开发手册
  - DDD 分层原则和最佳实践
  - 新模块完整开发流程（订单模块示例）
  - 认证、权限、文件存储、审计、日志详细机制
  - 排错指南和常见问题
- [docs/permission-architecture.drawio](./docs/permission-architecture.drawio) — 权限系统架构图

## 开发规范

### 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
feat: 新增功能
fix: 修复 bug
docs: 文档更新
style: 代码格式（不影响功能）
refactor: 重构（既不是 feat 也不是 fix）
perf: 性能优化
test: 测试相关
chore: 构建过程或辅助工具的变动
```

### 代码规范

- **TypeScript**: 启用严格模式，所有代码必须有类型注解
- **ESLint**: 统一代码风格，提交前自动修复
- **Prettier**: 统一代码格式
- **测试**: 核心业务逻辑必须编写单元测试

### 分支管理

- `main`: 主分支，始终可部署
- `feature/*`: 功能分支
- `fix/*`: 修复分支
- `release/*`: 发布分支

## License

[MIT](./LICENSE)
