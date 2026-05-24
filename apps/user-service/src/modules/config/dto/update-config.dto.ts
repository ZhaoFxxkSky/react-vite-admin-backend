import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';
import { idSchema } from '@shared';

export const updateConfigSchema = extendApi(
  idSchema.merge(
    z.object({
      key: extendApi(
        z
          .string()
          .min(1)
          .max(100)
          .regex(/^[a-zA-Z0-9_.-]+$/)
          .optional(),
        { description: '配置键', example: 'app.name' },
      ),
      value: extendApi(z.string().min(1).optional(), {
        description: '配置值',
        example: 'Data Space',
      }),
      type: extendApi(
        z.enum(['string', 'number', 'boolean', 'json']).optional(),
        { description: '值类型', example: 'string' },
      ),
      group: extendApi(z.string().max(50).optional(), {
        description: '配置分组',
        example: 'system',
      }),
      name: extendApi(z.string().min(1).max(100).optional(), {
        description: '配置名称',
        example: '应用名称',
      }),
      description: extendApi(z.string().max(255).nullish(), {
        description: '描述',
      }),
      status: extendApi(z.enum(['active', 'inactive']).optional(), {
        description: '状态',
        example: 'active',
      }),
    }),
  ) as any,
  { title: 'UpdateConfigDto', description: '更新参数配置请求参数' },
);

export type UpdateConfigDto = z.infer<typeof updateConfigSchema>;
