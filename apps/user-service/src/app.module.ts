import { Module } from '@nestjs/common';
import {
  ConfigModule,
  PrismaModule,
  CacheModule,
  LoggerModule,
  HealthModule,
  ExceptionModule,
} from '@core';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { PermissionModule } from './modules/permission/permission.module';
import { RoleModule } from './modules/role/role.module';
import { FileModule } from './modules/file/file.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { DataPermissionModule } from './modules/data-permission/data-permission.module';
import { SessionModule } from './modules/session/session.module';
import { ApiPermissionModule } from './modules/api-permission/api-permission.module';

@Module({
  imports: [
    ConfigModule.forRoot('apps/user-service/config'),
    LoggerModule,
    PrismaModule,
    CacheModule,
    AuditModule,
    HealthModule,
    ExceptionModule,
    AuthModule,
    UserModule,
    OrganizationModule,
    PermissionModule,
    RoleModule,
    FileModule,
    DataPermissionModule,
    SessionModule,
    ApiPermissionModule,
  ],
})
export class AppModule {}
