import { Controller, Get, Delete, UseGuards, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser, AuthenticatedUser } from '@app/user-platform';
import { OnlineService } from './online.service';

@ApiTags('在线用户')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class OnlineController {
  constructor(private readonly onlineService: OnlineService) {}

  @Get('online')
  async getOnlineUsers() {
    return this.onlineService.getOnlineUsers();
  }

  @Delete(':sessionId')
  async forceLogout(@Param('sessionId') sessionId: string) {
    return this.onlineService.forceLogout(sessionId);
  }
}

@ApiTags('我的会话')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user/sessions')
export class UserSessionController {
  constructor(private readonly onlineService: OnlineService) {}

  @Get()
  async getMySessions(@CurrentUser() user: AuthenticatedUser) {
    return this.onlineService.getUserSessions(user.id);
  }

  @Delete('others')
  async logoutOthers(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentUser('sessionId') sessionId: string,
  ) {
    return this.onlineService.logoutOtherSessions(sessionId, user.id);
  }
}
