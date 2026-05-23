import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';
import { idSchema } from '@shared';

export const updatePostSchema = extendApi(
  idSchema.merge(
    z.object({
      code: extendApi(
        z
          .string()
          .min(1)
          .max(50)
          .regex(/^[a-zA-Z0-9_-]+$/)
          .optional(),
        { description: '岗位编码(全局唯一)', example: 'developer' },
      ),
      name: extendApi(z.string().min(1).max(50).optional(), {
        description: '岗位名称',
        example: '开发工程师',
      }),
      level: extendApi(z.coerce.number().int().optional(), {
        description: '岗位级别',
        example: 1,
      }),
      sortOrder: extendApi(z.coerce.number().int().optional(), {
        description: '排序权重',
        example: 0,
      }),
      status: extendApi(z.enum(['active', 'inactive']).optional(), {
        description: '状态',
        example: 'active',
      }),
      description: extendApi(z.string().max(255).nullish(), {
        description: '岗位描述',
      }),
    }),
  ) as any,
  { title: 'UpdatePostDto', description: '更新岗位请求参数' },
);

export type UpdatePostDto = z.infer<typeof updatePostSchema>;
