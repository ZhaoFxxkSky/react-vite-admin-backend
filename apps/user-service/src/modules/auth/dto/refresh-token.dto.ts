import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';

export const refreshTokenSchema = extendApi(
  z.object({
    refreshToken: extendApi(z.string().min(1), { description: '刷新令牌' }),
  }),
  { title: 'RefreshTokenDto', description: '刷新令牌请求参数' },
);

export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
