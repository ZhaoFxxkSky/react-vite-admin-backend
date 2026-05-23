import { Module } from '@nestjs/common';
import {
  ConfigModule,
  PrismaModule,
  CacheModule,
  LoggerModule,
  HealthModule,
  ExceptionModule,
} from '@core';
import { UserPlatformModule } from '@app/user-platform';
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
import { CaptchaModule } from './modules/captcha/captcha.module';
import { LoginLogModule } from './modules/login-log/login-log.module';
import { PasswordPolicyModule } from './modules/password-policy/password-policy.module';
import { PostModule } from './modules/post/post.module';
import { DictModule } from './modules/dict/dict.module';
import { ConfigModule as SysConfigModule } from './modules/config/config.module';
import { ExcelModule } from './modules/excel/excel.module';
import { OAuthModule } from './modules/oauth/oauth.module';
import { ThrottlerModule } from './modules/throttler/throttler.module';
import { ProfileModule } from './modules/profile/profile.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { OnlineModule } from './modules/online/online.module';
import { NoticeModule } from './modules/notice/notice.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { MonitorModule } from './modules/monitor/monitor.module';
import { MessageModule } from './modules/message/message.module';
import { SettingsModule } from './modules/settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot('apps/user-service/config'),
    LoggerModule,
    PrismaModule,
    CacheModule,
    UserPlatformModule,
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
    CaptchaModule,
    LoginLogModule,
    PasswordPolicyModule,
    PostModule,
    DictModule,
    SysConfigModule,
    ExcelModule,
    OAuthModule,
    ThrottlerModule,
    ProfileModule,
    AuditLogModule,
    OnlineModule,
    NoticeModule,
    SchedulerModule,
    MonitorModule,
    MessageModule,
    SettingsModule,
  ],
})
export class AppModule {}
