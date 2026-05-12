import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';
import { paginationSchema } from '@shared';

export const listRoleByPageSchema = extendApi(
  paginationSchema.merge(
    z.object({
      type: extendApi(z.enum(['system', 'custom']).nullish(), {
        description: '角色类型',
        example: 'custom',
      }),
      status: extendApi(z.enum(['active', 'inactive']).nullish(), {
        description: '角色状态',
        example: 'active',
      }),
      keyword: extendApi(z.string().nullish(), {
        description: '关键字(匹配编码或名称)',
        example: 'admin',
      }),
    }),
  ),
  { title: 'ListRoleByPageDto', description: '分页查询角色请求参数' },
);

export type ListRoleByPageDto = z.infer<typeof listRoleByPageSchema>;
