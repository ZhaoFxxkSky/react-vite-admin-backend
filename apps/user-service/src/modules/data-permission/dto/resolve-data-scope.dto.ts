import { extendApi } from '@anatine/zod-openapi';
import { z } from 'zod';

export const resolveDataScopeSchema = extendApi(
  z.object({
    userId: extendApi(z.coerce.number().int(), {
      description: '用户ID',
      example: 1,
    }),
    resourceCode: extendApi(z.string().min(1), {
      description: '资源编码',
      example: 'system:user',
    }),
    action: extendApi(
      z
        .enum([
          'view',
          'create',
          'update',
          'delete',
          'export',
          'approve',
          'assign',
        ])
        .default('view'),
      {
        description: '操作类型',
        example: 'view',
      },
    ),
  }),
  {
    title: 'ResolveDataScopeDto',
    description: '解析用户数据权限请求',
  },
);

export type ResolveDataScopeDto = z.infer<typeof resolveDataScopeSchema>;
