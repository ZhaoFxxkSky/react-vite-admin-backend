import { Module } from '@nestjs/common';
import { OnlineController, UserSessionController } from './online.controller';
import { OnlineService } from './online.service';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [SessionModule],
  controllers: [OnlineController, UserSessionController],
  providers: [OnlineService],
})
export class OnlineModule {}
