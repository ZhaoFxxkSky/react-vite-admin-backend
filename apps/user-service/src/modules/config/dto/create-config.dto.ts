import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';

export const createConfigSchema = extendApi(
  z.object({
    key: extendApi(
      z
        .string()
        .min(1)
        .max(100)
        .regex(/^[a-zA-Z0-9_.-]+$/),
      { description: '配置键(全局唯一)', example: 'app.name' },
    ),
    value: extendApi(z.string().min(1), {
      description: '配置值',
      example: 'Data Space',
    }),
    type: extendApi(
      z.enum(['string', 'number', 'boolean', 'json']).default('string'),
      { description: '值类型', example: 'string' },
    ),
    group: extendApi(z.string().max(50).default('system'), {
      description: '配置分组',
      example: 'system',
    }),
    name: extendApi(z.string().min(1).max(100), {
      description: '配置名称',
      example: '应用名称',
    }),
    description: extendApi(z.string().max(255).nullish(), {
      description: '描述',
      example: '系统显示名称',
    }),
  }),
  { title: 'CreateConfigDto', description: '创建参数配置请求参数' },
);

export type CreateConfigDto = z.infer<typeof createConfigSchema>;
