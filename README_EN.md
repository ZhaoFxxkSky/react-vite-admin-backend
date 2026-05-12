# Data Space

> Enterprise-grade NestJS 11 monorepo backend scaffold — HTTP API + scheduled Worker, strict DDD layering, Prisma + MariaDB + Redis, JWT dual-token + RBAC + data-scope, Zod-driven validation & docs.

[中文](./README.md) · **English**

![Node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/license-UNLICENSED-lightgrey)

## Overview

`data-space` is a NestJS monorepo scaffold for back-office / mid-platform business systems. Infrastructure (database, cache, file storage, logging, permissions) is abstracted behind interfaces, and business modules follow a strict DDD layering. The goal: **let you focus on business logic, swap infrastructure freely, and stay maintainable long-term**.

The repo ships two independently runnable apps: `user-service` (HTTP API) and `worker` (scheduled jobs).

## Features

- **NestJS 11 monorepo** — two apps: `user-service` (HTTP API) + `worker` (standalone Cron process)
- **Strict DDD layering** — Presentation / Application / Domain / Infrastructure isolated; business is portable
- **Prisma 7 + MariaDB** — via `@prisma/adapter-mariadb`
- **JWT dual-token auth** — Access + Refresh; Refresh Token stored in Redis, single-use refresh
- **Full RBAC + data permissions** — roles, API permissions, data scopes (self, org, org+children, all, custom)
- **Zod-driven validation & docs** — one schema powers both runtime validation and Swagger / OpenAPI
- **Pluggable infrastructure** — file storage (local / MinIO), cache, logger all behind interfaces
- **Ops-ready** — `/health` health checks, audit log, Winston daily-rotated logs

## Tech Stack

| Category | Choice | Version |
|----------|--------|---------|
| Runtime | Node.js | >= 20 |
| Package manager | pnpm | >= 9 |
| Framework | NestJS | 11.x |
| Language | TypeScript | 5.x |
| ORM | Prisma | 7.x |
| Database | MariaDB / MySQL | >= 8 |
| Cache | Redis | >= 7 |
| Validation | Zod + `@anatine/zod-openapi` | — |
| Auth | `@nestjs/jwt` + `passport-jwt` + `bcryptjs` | — |
| Logging | Winston + nest-winston + daily-rotate-file | — |

## Project Structure

```
data-space/
├── apps/
│   ├── user-service/        # HTTP API app
│   │   src/
│   │   ├── main.ts          # entry
│   │   ├── bootstrap.ts     # global pipes/guards/interceptors/Swagger setup
│   │   ├── app.module.ts
│   │   └── modules/         # business modules (see below)
│   └── worker/              # scheduled-job worker (standalone process)
│       src/
│       ├── main.ts
│       └── modules/scheduler/
├── libs/
│   ├── core/                # infrastructure layer (alias @core)
│   │   src/{audit, cache, config, data-scope, decorators, exception,
│   │         guards, health, interceptors, logger, middleware,
│   │         pipes, prisma}/
│   └── shared/              # pure utilities (alias @shared, no NestJS deps)
│       src/{constants, dto, enums, interfaces, utils}/
├── prisma/                  # schema.prisma + migrations + generated client
├── docs/                    # HANDBOOK.md (in-depth dev guide) + architecture diagrams
├── logs/                    # Winston daily-rotated log output
├── uploads/                 # default local file-storage directory
└── test/                    # E2E tests
```

Business modules under [apps/user-service/src/modules/](./apps/user-service/src/modules):

```
auth · user · role · permission · api-permission · data-permission
organization · session · file · audit · task
```

## Quick Start

**Prerequisites**: Node.js ≥ 20, pnpm ≥ 9, MariaDB/MySQL ≥ 8, Redis ≥ 7.

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment variables
cp .env.example .env
# Edit .env — at minimum fill in DB_* / REDIS_* / JWT_SECRET / JWT_REFRESH_SECRET

# 3. Generate Prisma client and run migrations
pnpm db:generate
pnpm db:migrate

# 4. Start the dev servers
pnpm start:dev              # HTTP API (default port 3000)
pnpm start:worker:dev       # Worker — run in a separate terminal
```

After startup, business endpoints live under `http://localhost:3000/api/v1/...`.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm start:dev` | Run user-service with hot reload |
| `pnpm start:debug` | Run user-service with `--debug --watch` |
| `pnpm start:worker:dev` | Run worker with hot reload |
| `pnpm build` | Build user-service |
| `pnpm build:worker` | Build worker |
| `pnpm start:prod` | Run built API (`node dist/apps/user-service/main`) |
| `pnpm start:worker:prod` | Run built worker |
| `pnpm db:generate` | Generate Prisma Client |
| `pnpm db:migrate` | Create & apply migration (`prisma migrate dev`) |
| `pnpm db:studio` | Launch Prisma Studio web UI |
| `pnpm lint` | ESLint check + auto-fix |
| `pnpm format` | Prettier format |
| `pnpm test` | Jest unit tests |
| `pnpm test:cov` | Coverage report |
| `pnpm test:e2e` | E2E tests |

Full list in the `scripts` field of [package.json](./package.json).

## Environment Variables

See [.env.example](./.env.example). Key variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Runtime environment | `development` / `production` |
| `PORT` | HTTP port | `3000` |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | MariaDB connection | `localhost` `3306` `root` `root` `data_space` |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` / `REDIS_DB` | Redis connection | `localhost` `6379` |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | Access Token config | ≥16 chars / `15m` |
| `JWT_REFRESH_SECRET` / `JWT_REFRESH_EXPIRES_IN` | Refresh Token config | ≥16 chars / `7d` |
| `STORAGE_TYPE` | File-storage backend | `local` / `minio` |
| `STORAGE_LOCAL_PATH` | Drop path for local mode | `uploads` |
| `STORAGE_MINIO_*` | MinIO config (endpoint / port / key / secret / bucket) | — |

> Env vars are validated against Zod schemas at startup — missing required keys cause the process to exit immediately.

## API Docs

Swagger UI is registered by `@nestjs/swagger`; the exact mount path is defined in [apps/user-service/src/bootstrap.ts](./apps/user-service/src/bootstrap.ts). All business endpoints are versioned under `/api/v1/` (NestJS URI Versioning).

## Health Checks

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Aggregate (DB + Redis) |
| `GET /health/db` | MariaDB liveness |
| `GET /health/redis` | Redis liveness |

If any check is down, the aggregate `/health` returns HTTP 503.

## Deployment

```bash
# Build
pnpm install --frozen-lockfile
pnpm build
pnpm build:worker

# Run
pnpm start:prod              # node dist/apps/user-service/main
pnpm start:worker:prod       # node dist/apps/worker/main
```

Minimal topology: Nginx → user-service (horizontally scalable) + worker (single instance, or multiple with Redis distributed locks) + MariaDB + Redis.

## Further Reading

- [docs/HANDBOOK.md](./docs/HANDBOOK.md) — in-depth developer handbook: DDD layering principles, full new-module walkthrough (Order example), detailed auth / permission / file-storage / audit / logging mechanics, troubleshooting
- [docs/permission-architecture.drawio](./docs/permission-architecture.drawio) — permission-system architecture diagram

## License

UNLICENSED — private project.
