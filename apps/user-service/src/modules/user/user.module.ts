import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './infrastructure/repositories/user.repository';
import { OrganizationModule } from '../organization/organization.module';

@Module({
  imports: [OrganizationModule],
  controllers: [UserController],
  providers: [UserService, UserRepository],
  exports: [UserService, UserRepository],
})
export class UserModule {}
