import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';

export const createApiKeySchema = extendApi(
  z.object({
    name: extendApi(z.string().min(1).max(100), {
      description: 'API Key 名称',
      example: '生产环境密钥',
    }),
    permissions: extendApi(z.array(z.string()).default([]), {
      description: '权限列表',
    }),
    rateLimit: extendApi(z.coerce.number().min(1).max(10000).default(1000), {
      description: '速率限制（次/小时）',
    }),
    expiresDays: extendApi(z.coerce.number().min(1).max(365).nullish(), {
      description: '过期天数（null 表示永不过期）',
    }),
  }),
  { title: 'CreateApiKeyDto', description: '创建 API Key' },
);

export type CreateApiKeyDto = z.infer<typeof createApiKeySchema>;

export const listApiKeySchema = extendApi(
  z.object({
    current: extendApi(z.coerce.number().min(1).default(1), {
      description: '当前页',
    }),
    pageSize: extendApi(z.coerce.number().min(1).max(100).default(20), {
      description: '每页条数',
    }),
  }),
  { title: 'ListApiKeyDto', description: '查询 API Key 列表' },
);

export type ListApiKeyDto = z.infer<typeof listApiKeySchema>;
