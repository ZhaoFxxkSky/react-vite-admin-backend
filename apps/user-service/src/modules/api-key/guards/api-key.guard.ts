import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyService } from '../api-key.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'] as string;
    const apiSecret = request.headers['x-api-secret'] as string;

    if (!apiKey || !apiSecret) {
      throw new UnauthorizedException('API Key and Secret are required');
    }

    const key = await this.apiKeyService.validateApiKey(apiKey, apiSecret);
    if (!key) {
      throw new UnauthorizedException('Invalid API Key or Secret');
    }

    // 将 API Key 信息附加到请求上
    (request as any).apiKey = key;

    return true;
  }
}
