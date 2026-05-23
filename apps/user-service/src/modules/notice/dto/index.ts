import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';

export const createNoticeSchema = extendApi(
  z.object({
    title: extendApi(z.string().min(1).max(100), {
      description: '标题',
      example: '系统维护通知',
    }),
    content: extendApi(z.string().min(1), {
      description: '内容（富文本）',
      example: '<p>系统将于今晚进行维护...</p>',
    }),
    type: extendApi(z.enum(['system', 'update', 'maintenance', 'security']).default('system'), {
      description: '类型',
    }),
    isTop: extendApi(z.boolean().default(false), {
      description: '是否置顶',
    }),
    isPopup: extendApi(z.boolean().default(false), {
      description: '是否弹窗',
    }),
    startAt: extendApi(z.coerce.date(), {
      description: '生效时间',
    }),
    endAt: extendApi(z.coerce.date().nullish(), {
      description: '过期时间',
    }),
    targetRoles: extendApi(z.array(z.string()).nullish(), {
      description: '目标角色（空表示全部）',
    }),
  }),
  { title: 'CreateNoticeDto', description: '创建公告' },
);

export type CreateNoticeDto = z.infer<typeof createNoticeSchema>;

export const listNoticeSchema = extendApi(
  z.object({
    current: extendApi(z.coerce.number().min(1).default(1), {
      description: '当前页',
    }),
    pageSize: extendApi(z.coerce.number().min(1).max(100).default(20), {
      description: '每页条数',
    }),
  }),
  { title: 'ListNoticeDto', description: '查询公告' },
);

export type ListNoticeDto = z.infer<typeof listNoticeSchema>;
