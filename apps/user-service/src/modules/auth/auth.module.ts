import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserModule } from '../user/user.module';
import { ApiPermissionModule } from '../api-permission/api-permission.module';
import { PermissionModule } from '../permission/permission.module';
import { SessionModule } from '../session/session.module';
import { CaptchaModule } from '../captcha/captcha.module';
import { LoginLogModule } from '../login-log/login-log.module';
import { PasswordPolicyModule } from '../password-policy/password-policy.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    UserModule,
    PermissionModule,
    ApiPermissionModule,
    SessionModule,
    CaptchaModule,
    LoginLogModule,
    PasswordPolicyModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
