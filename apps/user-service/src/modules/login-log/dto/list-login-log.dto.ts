import { extendApi } from '@anatine/zod-openapi';
import { z } from 'zod';
import { paginationSchema } from '@shared';

export const listLoginLogSchema = extendApi(
  paginationSchema.merge(
    z.object({
      userId: extendApi(z.coerce.number().int().positive().nullish(), {
        description: '用户 id',
        example: 1,
      }),
      username: extendApi(z.string().nullish(), {
        description: '用户名',
        example: 'admin',
      }),
      status: extendApi(z.string().nullish(), {
        description: '登录状态',
        example: 'success',
      }),
      startTime: extendApi(z.string().nullish(), {
        description: '开始时间',
        example: '2024-01-01 00:00:00',
      }),
      endTime: extendApi(z.string().nullish(), {
        description: '结束时间',
        example: '2024-12-31 23:59:59',
      }),
    }),
  ),
  { title: 'ListLoginLogDto', description: '分页查询登录日志请求参数' },
);

export type ListLoginLogDto = z.infer<typeof listLoginLogSchema>;
