import { Module } from '@nestjs/common';
import { PasswordPolicyService } from './password-policy.service';
import { PasswordPolicyController } from './password-policy.controller';

@Module({
  imports: [],
  controllers: [PasswordPolicyController],
  providers: [PasswordPolicyService],
  exports: [PasswordPolicyService],
})
export class PasswordPolicyModule {}
