import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';
import { idSchema } from '@shared';

export const updateDictTypeSchema = extendApi(
  idSchema.merge(
    z.object({
      code: extendApi(
        z
          .string()
          .min(1)
          .max(50)
          .regex(/^[a-zA-Z0-9_-]+$/)
          .optional(),
        { description: '字典类型编码(全局唯一)', example: 'gender' },
      ),
      name: extendApi(z.string().min(1).max(50).optional(), {
        description: '字典类型名称',
        example: '性别',
      }),
      description: extendApi(z.string().max(255).nullish(), {
        description: '字典类型描述',
      }),
      status: extendApi(z.enum(['active', 'inactive']).optional(), {
        description: '状态',
        example: 'active',
      }),
    }),
  ) as any,
  { title: 'UpdateDictTypeDto', description: '更新字典类型请求参数' },
);

export type UpdateDictTypeDto = z.infer<typeof updateDictTypeSchema>;
