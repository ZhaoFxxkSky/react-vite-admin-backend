import { Module, Global } from '@nestjs/common';
import { UserPlatformPrismaService } from './prisma/user-platform-prisma.service';
import { DataScopeCache } from './data-scope/data-scope.cache';
import { JwtGuard } from './guards/jwt.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { DataScopeInterceptor } from './interceptors/data-scope.interceptor';

@Global()
@Module({
  providers: [UserPlatformPrismaService, DataScopeCache, JwtGuard, PermissionsGuard, DataScopeInterceptor],
  exports: [UserPlatformPrismaService, DataScopeCache, JwtGuard, PermissionsGuard, DataScopeInterceptor],
})
export class UserPlatformModule {}
