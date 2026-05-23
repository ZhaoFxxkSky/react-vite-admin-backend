import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';

export const createPostSchema = extendApi(
  z.object({
    code: extendApi(
      z
        .string()
        .min(1)
        .max(50)
        .regex(/^[a-zA-Z0-9_-]+$/),
      { description: '岗位编码(全局唯一)', example: 'developer' },
    ),
    name: extendApi(z.string().min(1).max(50), {
      description: '岗位名称',
      example: '开发工程师',
    }),
    level: extendApi(z.coerce.number().int().default(1).optional(), {
      description: '岗位级别',
      example: 1,
    }),
    sortOrder: extendApi(z.coerce.number().int().default(0).optional(), {
      description: '排序权重',
      example: 0,
    }),
    description: extendApi(z.string().max(255).nullish(), {
      description: '岗位描述',
      example: '负责软件开发',
    }),
  }),
  { title: 'CreatePostDto', description: '创建岗位请求参数' },
);

export type CreatePostDto = z.infer<typeof createPostSchema>;
