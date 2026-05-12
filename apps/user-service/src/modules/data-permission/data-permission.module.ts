import { Module } from '@nestjs/common';
import { DataScopeInterceptor, DATA_SCOPE_RESOLVER } from '@core/interceptors/data-scope.interceptor';
import { DataPermissionService } from './data-permission.service';
import { DataPermissionController } from './data-permission.controller';
import { UserDataScopeResolver } from './data-scope.resolver';
import { RoleModule } from '../role/role.module';
import { OrganizationModule } from '../organization/organization.module';

@Module({
  imports: [RoleModule, OrganizationModule],
  providers: [
    DataPermissionService,
    UserDataScopeResolver,
    DataScopeInterceptor,
    { provide: DATA_SCOPE_RESOLVER, useClass: UserDataScopeResolver },
  ],
  controllers: [DataPermissionController],
  exports: [DataPermissionService, UserDataScopeResolver, DATA_SCOPE_RESOLVER, DataScopeInterceptor],
})
export class DataPermissionModule {}
