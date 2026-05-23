import { Module } from '@nestjs/common';
import { OAuthService } from './oauth.service';
import { OAuthController } from './oauth.controller';
import { OAuthRepository } from './infrastructure/repositories/oauth.repository';

@Module({
  imports: [],
  controllers: [OAuthController],
  providers: [OAuthService, OAuthRepository],
  exports: [OAuthService, OAuthRepository],
})
export class OAuthModule {}
