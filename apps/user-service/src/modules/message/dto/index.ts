import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';

export const sendMessageSchema = extendApi(
  z.object({
    receiverId: extendApi(z.coerce.number().min(1), {
      description: '接收者ID',
      example: 1,
    }),
    title: extendApi(z.string().min(1).max(100), {
      description: '标题',
      example: '系统通知',
    }),
    content: extendApi(z.string().min(1), {
      description: '内容',
      example: '您的账号已成功创建',
    }),
    type: extendApi(z.enum(['system', 'user']).default('user'), {
      description: '消息类型',
    }),
  }),
  { title: 'SendMessageDto', description: '发送消息' },
);

export type SendMessageDto = z.infer<typeof sendMessageSchema>;

export const listMessageSchema = extendApi(
  z.object({
    current: extendApi(z.coerce.number().min(1).default(1), {
      description: '当前页',
    }),
    pageSize: extendApi(z.coerce.number().min(1).max(100).default(20), {
      description: '每页条数',
    }),
    type: extendApi(z.enum(['system', 'user', 'all']).default('all'), {
      description: '消息类型筛选',
    }),
    isRead: extendApi(z.boolean().nullish(), {
      description: '已读状态筛选',
    }),
  }),
  { title: 'ListMessageDto', description: '查询消息列表' },
);

export type ListMessageDto = z.infer<typeof listMessageSchema>;
