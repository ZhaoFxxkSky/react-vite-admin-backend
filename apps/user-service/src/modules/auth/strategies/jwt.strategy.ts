import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload, AuthenticatedUser } from '@shared';
import { PrismaService } from '@core';
import { ApiPermissionService } from '../../api-permission/api-permission.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly apiPermissionService: ApiPermissionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        userOrganizations: {
          where: { isPrimary: true },
          select: { organizationId: true },
        },
      },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User not found or inactive');
    }

    const apiPermissions = user.isSuperAdmin
      ? []
      : await this.apiPermissionService.listCodesByUserId(user.id);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      organizationId: user.userOrganizations[0]?.organizationId ?? null,
      isSuperAdmin: user.isSuperAdmin,
      apiPermissions,
      jti: (payload as any).jti,
    };
  }
}
