import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';

export const listAuditLogSchema = extendApi(
  z.object({
    current: extendApi(z.coerce.number().min(1).default(1), {
      description: '当前页',
      example: 1,
    }),
    pageSize: extendApi(z.coerce.number().min(1).max(100).default(20), {
      description: '每页条数',
      example: 20,
    }),
    userId: extendApi(z.coerce.number().nullish(), {
      description: '用户ID',
    }),
    module: extendApi(z.string().nullish(), {
      description: '模块',
    }),
    action: extendApi(z.string().nullish(), {
      description: '操作类型',
    }),
    startDate: extendApi(z.coerce.date().nullish(), {
      description: '开始日期',
    }),
    endDate: extendApi(z.coerce.date().nullish(), {
      description: '结束日期',
    }),
    isSensitive: extendApi(z.boolean().nullish(), {
      description: '是否敏感操作',
    }),
  }),
  { title: 'ListAuditLogDto', description: '查询审计日志' },
);

export type ListAuditLogDto = z.infer<typeof listAuditLogSchema>;
