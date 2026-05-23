import { Module } from '@nestjs/common';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';
import { SessionActivityInterceptor } from '../../interceptors/session-activity.interceptor';

@Module({
  providers: [SessionService, SessionActivityInterceptor],
  controllers: [SessionController],
  exports: [SessionService, SessionActivityInterceptor],
})
export class SessionModule {}
