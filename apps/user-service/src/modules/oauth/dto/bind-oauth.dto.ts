import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';

export const bindOAuthSchema = extendApi(
  z.object({
    userId: extendApi(z.coerce.number().int().positive(), {
      description: '用户 id',
      example: 1,
    }),
    provider: extendApi(z.string().min(1).max(20), {
      description: 'OAuth 提供商',
      example: 'github',
    }),
    providerId: extendApi(z.string().min(1).max(100), {
      description: '第三方用户标识',
      example: '12345678',
    }),
    unionId: extendApi(z.string().max(100).nullish(), {
      description: '联合标识',
      example: null,
    }),
    accessToken: extendApi(z.string().max(500).nullish(), {
      description: '访问令牌',
      example: null,
    }),
    refreshToken: extendApi(z.string().max(500).nullish(), {
      description: '刷新令牌',
      example: null,
    }),
    expiresAt: extendApi(z.coerce.date().nullish(), {
      description: '令牌过期时间',
      example: null,
    }),
  }),
  { title: 'BindOAuthDto', description: '绑定 OAuth 请求参数' },
);

export type BindOAuthDto = z.infer<typeof bindOAuthSchema>;
