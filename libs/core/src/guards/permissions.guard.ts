import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  API_PERMISSION_KEY,
  ApiPermissionMeta,
} from '../decorators/api-permission.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const apiMeta = this.reflector.get<ApiPermissionMeta | undefined>(
      API_PERMISSION_KEY,
      context.getHandler(),
    );

    if (!apiMeta) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('Unauthenticated');
    }

    if (user.isSuperAdmin) {
      return true;
    }

    if (!user.apiPermissions?.includes(apiMeta.code)) {
      throw new ForbiddenException('当前账号无权访问该接口，请联系管理员授权');
    }

    return true;
  }
}
