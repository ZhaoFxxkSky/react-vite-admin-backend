import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';
import { paginationSchema } from '@shared';

export const listPermissionByPageSchema = extendApi(
  paginationSchema.merge(
    z.object({
      type: extendApi(
        z.enum(['catalog', 'menu', 'embedded', 'link', 'button']).nullish(),
        {
          description: '权限类型',
          example: 'menu',
        },
      ),
      keyword: extendApi(z.string().nullish(), {
        description: '关键字(匹配编码或名称)',
        example: 'user',
      }),
    }),
  ),
  { title: 'ListPermissionByPageDto', description: '分页查询权限请求参数' },
);

export type ListPermissionByPageDto = z.infer<
  typeof listPermissionByPageSchema
>;
