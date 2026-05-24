import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '@core';

@Injectable()
export class IpFilterGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = request.ip || request.socket.remoteAddress || '';
    const path = request.path;

    // 只拦截登录相关接口
    if (!path.includes('/auth/')) {
      return true;
    }

    // 检查是否在白名单（如果配置了白名单）
    const whiteList = await this.prisma.sysConfig.findMany({
      where: { group: 'ip_whitelist' },
    });

    if (whiteList.length > 0) {
      const allowed = whiteList.some((rule) => this.ipMatches(clientIp, rule.value));
      if (!allowed) {
        throw new ForbiddenException('IP not in whitelist');
      }
    }

    // 检查是否在黑名单
    const blackList = await this.prisma.sysConfig.findMany({
      where: { group: 'ip_blacklist' },
    });

    const blocked = blackList.some((rule) => this.ipMatches(clientIp, rule.value));
    if (blocked) {
      throw new ForbiddenException('IP blocked');
    }

    return true;
  }

  private ipMatches(ip: string, rule: string): boolean {
    // 支持精确匹配和 CIDR
    if (rule.includes('/')) {
      return this.isInCidr(ip, rule);
    }
    return ip === rule;
  }

  private isInCidr(ip: string, cidr: string): boolean {
    const [range, bits] = cidr.split('/');
    const mask = parseInt(bits, 10);
    
    const ipParts = ip.split('.').map(Number);
    const rangeParts = range.split('.').map(Number);
    
    if (ipParts.length !== 4 || rangeParts.length !== 4) return false;
    
    const ipInt = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
    const rangeInt = (rangeParts[0] << 24) + (rangeParts[1] << 16) + (rangeParts[2] << 8) + rangeParts[3];
    const maskInt = -1 << (32 - mask);
    
    return (ipInt & maskInt) === (rangeInt & maskInt);
  }
}
