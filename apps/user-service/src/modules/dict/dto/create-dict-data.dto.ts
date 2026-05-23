import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';

export const createDictDataSchema = extendApi(
  z.object({
    dictId: extendApi(z.coerce.number().int(), {
      description: '字典类型 id',
      example: 1,
    }),
    label: extendApi(z.string().min(1).max(50), {
      description: '字典标签',
      example: '男',
    }),
    value: extendApi(z.string().min(1).max(50), {
      description: '字典值',
      example: 'male',
    }),
    sortOrder: extendApi(z.coerce.number().int().default(0).optional(), {
      description: '排序权重',
      example: 0,
    }),
    remark: extendApi(z.string().max(255).nullish(), {
      description: '备注',
      example: '男性用户',
    }),
  }),
  { title: 'CreateDictDataDto', description: '创建字典数据请求参数' },
);

export type CreateDictDataDto = z.infer<typeof createDictDataSchema>;
