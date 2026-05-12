import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
  UsePipes,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { generateSchema } from '@anatine/zod-openapi';
import {
  JwtGuard,
  PermissionsGuard,
  ApiPermission,
  ZodValidationPipe,
} from '@core';
import { SessionService } from './session.service';
import { listOnlineSchema, kickSessionSchema, ListOnlineDto } from './dto';

@ApiTags('Sessions')
@ApiBearerAuth()
@Controller('sessions')
@UseGuards(JwtGuard, PermissionsGuard)
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post('online/listByPage')
  @ApiPermission({
    code: 'system:session:list',
    name: '查询在线会话',
    module: '会话管理',
  })
  @ApiOperation({
    summary: 'List online sessions',
    description: '分页查询在线会话列表（会话粒度，包含用户与设备信息）',
  })
  @ApiBody({ schema: generateSchema(listOnlineSchema, false, '3.0') as any })
  @UsePipes(new ZodValidationPipe(listOnlineSchema))
  async listOnlineByPage(@Body() dto: ListOnlineDto, @Req() req: any) {
    return this.sessionService.listOnlineUsers(dto, req.user?.jti);
  }

  @Get('online/detail')
  @ApiPermission({
    code: 'system:session:detail',
    name: '查询在线用户详情',
    module: '会话管理',
  })
  @ApiParam({ name: 'userId', description: '用户ID', type: Number })
  @ApiOperation({
    summary: 'Get online user detail',
    description: '查询指定在线用户的详细会话列表',
  })
  @ApiParam({ name: 'userId', description: '用户ID', type: Number })
  async getOnlineUserDetail(@Param('userId', ParseIntPipe) userId: number) {
    return this.sessionService.getOnlineUserDetail(userId);
  }

  @Post('kick')
  @ApiPermission({
    code: 'system:session:kick',
    name: '强制下线',
    module: '会话管理',
  })
  @ApiOperation({
    summary: 'Kick session',
    description:
      '强制下线：按 userId 踢掉该用户全部会话，或按 refreshToken 踢掉单个会话',
  })
  @ApiBody({ schema: generateSchema(kickSessionSchema, false, '3.0') as any })
  @UsePipes(new ZodValidationPipe(kickSessionSchema))
  async kick(@Body() dto: any) {
    if (dto.refreshToken) {
      const jti = await this.sessionService.getAccessTokenJti(dto.refreshToken);
      await this.sessionService.removeSession(dto.refreshToken);
      if (jti) {
        await this.sessionService.blacklistAccessToken(jti, 15 * 60);
      }
      return { message: 'Session kicked successfully' };
    }
    if (dto.userId != null) {
      const count = await this.sessionService.removeAllSessionsByUser(
        dto.userId,
      );
      return {
        message: `All sessions for user kicked successfully, count=${count}`,
      };
    }
    return { message: 'No action taken' };
  }

  @Get('me')
  @ApiOperation({
    summary: 'Current user sessions',
    description: '获取当前登录用户的所有会话列表',
  })
  async getMySessions(@Req() req: any) {
    return this.sessionService.getUserSessions(req.user?.id);
  }

  @Post('logout-all')
  @ApiOperation({
    summary: 'Logout all devices',
    description: '当前用户退出所有设备（包括当前会话）',
  })
  async logoutAllDevices(@Req() req: any) {
    const count = await this.sessionService.removeAllSessionsByUser(
      req.user?.id,
    );
    if (req.user?.jti) {
      await this.sessionService.blacklistAccessToken(req.user.jti, 15 * 60);
    }
    return { message: `Logged out from all devices, count=${count}` };
  }
}
