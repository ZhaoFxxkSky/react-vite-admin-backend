import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';

export const createWebhookSchema = extendApi(
  z.object({
    name: extendApi(z.string().min(1).max(100), {
      description: 'Webhook 名称',
      example: '用户注册通知',
    }),
    url: extendApi(z.string().url(), {
      description: '接收 URL',
      example: 'https://example.com/webhook',
    }),
    secret: extendApi(z.string().min(8).max(255), {
      description: '签名密钥',
      example: 'whsec_xxxxxxxx',
    }),
    events: extendApi(z.array(z.string()).min(1), {
      description: '订阅事件列表',
      example: ['user.registered', 'user.login'],
    }),
  }),
  { title: 'CreateWebhookDto', description: '创建 Webhook' },
);

export type CreateWebhookDto = z.infer<typeof createWebhookSchema>;

export const listWebhookSchema = extendApi(
  z.object({
    current: extendApi(z.coerce.number().min(1).default(1), {
      description: '当前页',
    }),
    pageSize: extendApi(z.coerce.number().min(1).max(100).default(20), {
      description: '每页条数',
    }),
  }),
  { title: 'ListWebhookDto', description: '查询 Webhook 列表' },
);

export type ListWebhookDto = z.infer<typeof listWebhookSchema>;
