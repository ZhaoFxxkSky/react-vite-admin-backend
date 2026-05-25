import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { UserModule } from '../user/user.module';
import { PasswordPolicyModule } from '../password-policy/password-policy.module';
import { FileModule } from '../file/file.module';

@Module({
  imports: [UserModule, PasswordPolicyModule, FileModule],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
