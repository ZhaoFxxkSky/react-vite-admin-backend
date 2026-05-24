import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export function createPrismaClient(): PrismaClient {
  // Prisma 7: datasource URL is configured in prisma.config.ts
  return new PrismaClient();
}

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  protected client: PrismaClient;

  constructor() {
    this.client = createPrismaClient();
  }

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }

  get user() {
    return this.client.user;
  }
  get role() {
    return this.client.role;
  }
  get permission() {
    return this.client.permission;
  }
  get organization() {
    return this.client.organization;
  }
  get userRole() {
    return this.client.userRole;
  }
  get rolePermission() {
    return this.client.rolePermission;
  }
  get userOrganization() {
    return this.client.userOrganization;
  }
  get file() {
    return this.client.file;
  }
  get auditLog() {
    return this.client.auditLog;
  }
  get refreshToken() {
    return this.client.refreshToken;
  }
  get dataPermissionMeta() {
    return this.client.dataPermissionMeta;
  }
  get roleDataPermissionScope() {
    return this.client.roleDataPermissionScope;
  }
  get roleResourceConfig() {
    return this.client.roleResourceConfig;
  }
  get apiPermission() {
    return this.client.apiPermission;
  }
  get roleApiPermission() {
    return this.client.roleApiPermission;
  }
  get loginLog() {
    return this.client.loginLog;
  }
  get passwordPolicy() {
    return this.client.passwordPolicy;
  }
  get passwordHistory() {
    return this.client.passwordHistory;
  }
  get post() {
    return this.client.post;
  }
  get userPost() {
    return this.client.userPost;
  }
  get dictType() {
    return this.client.dictType;
  }
  get dictData() {
    return this.client.dictData;
  }
  get sysConfig() {
    return this.client.sysConfig;
  }
  get userOAuth() {
    return this.client.userOAuth;
  }
  get notice() {
    return this.client.notice;
  }
  get noticeRead() {
    return this.client.noticeRead;
  }
  get message() {
    return this.client.message;
  }
  get apiKey() {
    return this.client.apiKey;
  }
  get webhook() {
    return this.client.webhook;
  }
  get tenant() {
    return this.client.tenant;
  }
  get tenantMember() {
    return this.client.tenantMember;
  }

  $transaction(...args: any[]) {
    return (this.client.$transaction as any)(...args);
  }

  $queryRaw(...args: any[]) {
    return (this.client.$queryRaw as any)(...args);
  }

  $queryRawUnsafe(...args: any[]) {
    return (this.client.$queryRawUnsafe as any)(...args);
  }

  $executeRaw(...args: any[]) {
    return (this.client.$executeRaw as any)(...args);
  }

  $extends(...args: any[]) {
    return (this.client.$extends as any)(...args);
  }
}
