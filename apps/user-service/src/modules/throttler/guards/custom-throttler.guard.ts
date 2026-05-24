import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
// import { ExecutionContext } from '@nestjs/common';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // 优先使用用户 ID，未登录使用 IP
    return req.user?.id || req.ip;
  }
}
