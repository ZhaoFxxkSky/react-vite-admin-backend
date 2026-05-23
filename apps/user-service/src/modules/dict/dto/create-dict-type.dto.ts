import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';

export const createDictTypeSchema = extendApi(
  z.object({
    code: extendApi(
      z
        .string()
        .min(1)
        .max(50)
        .regex(/^[a-zA-Z0-9_-]+$/),
      { description: '字典类型编码(全局唯一)', example: 'gender' },
    ),
    name: extendApi(z.string().min(1).max(50), {
      description: '字典类型名称',
      example: '性别',
    }),
    description: extendApi(z.string().max(255).nullish(), {
      description: '字典类型描述',
      example: '用户性别字典',
    }),
  }),
  { title: 'CreateDictTypeDto', description: '创建字典类型请求参数' },
);

export type CreateDictTypeDto = z.infer<typeof createDictTypeSchema>;
