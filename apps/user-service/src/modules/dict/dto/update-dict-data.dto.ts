import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';
import { idSchema } from '@shared';

export const updateDictDataSchema = extendApi(
  idSchema.merge(
    z.object({
      dictId: extendApi(z.coerce.number().int().optional(), {
        description: '字典类型 id',
        example: 1,
      }),
      label: extendApi(z.string().min(1).max(50).optional(), {
        description: '字典标签',
        example: '男',
      }),
      value: extendApi(z.string().min(1).max(50).optional(), {
        description: '字典值',
        example: 'male',
      }),
      sortOrder: extendApi(z.coerce.number().int().optional(), {
        description: '排序权重',
        example: 0,
      }),
      status: extendApi(z.enum(['active', 'inactive']).optional(), {
        description: '状态',
        example: 'active',
      }),
      remark: extendApi(z.string().max(255).nullish(), {
        description: '备注',
      }),
    }),
  ) as any,
  { title: 'UpdateDictDataDto', description: '更新字典数据请求参数' },
);

export type UpdateDictDataDto = z.infer<typeof updateDictDataSchema>;
