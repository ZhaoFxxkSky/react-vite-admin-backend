import { extendApi } from '@anatine/zod-openapi';
import { z } from 'zod';

export const kickSessionSchema = extendApi(
  z
    .object({
      userId: extendApi(z.coerce.number().int().nullish(), {
        description: '用户ID，传入则踢掉该用户全部会话',
        example: 1,
      }),
      refreshToken: extendApi(z.string().nullish(), {
        description: '指定刷新令牌，传入则仅踢掉该会话',
        example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      }),
    })
    .refine((data) => data.userId != null || data.refreshToken != null, {
      message: 'userId 和 refreshToken 至少传入一个',
    }),
  { title: 'KickSessionDto', description: '强制下线请求参数' },
);

export type KickSessionDto = z.infer<typeof kickSessionSchema>;
