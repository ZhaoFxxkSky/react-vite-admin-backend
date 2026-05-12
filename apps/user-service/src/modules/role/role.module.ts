import { Module } from '@nestjs/common';
import { PermissionModule } from '../permission/permission.module';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { RoleRepository } from './infrastructure/repositories/role.repository';

@Module({
  imports: [PermissionModule],
  controllers: [RoleController],
  providers: [RoleService, RoleRepository],
  exports: [RoleService, RoleRepository],
})
export class RoleModule {}
