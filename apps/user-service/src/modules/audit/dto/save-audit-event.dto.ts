import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';

/**
 * 审计事件 Zod schema(对齐 `@core` 的 `AuditEvent` 接口)。
 * 注意:`timestamp` 接受 ISO 字符串,Zod 自动转成 Date。
 */
export const saveAuditEventSchema = extendApi(
  z.object({
    serviceName: extendApi(z.string().min(1).max(100), {
      description: '服务名',
      example: 'user-service',
    }),
    eventType: extendApi(z.enum(['http', 'business']), {
      description: '事件类型',
      example: 'http',
    }),
    userId: extendApi(z.coerce.number().int().nullish(), {
      description: '用户 id(若可获取)',
      example: 1,
    }),
    action: extendApi(z.string().min(1).max(100), {
      description: '动作标识',
      example: 'login',
    }),
    resource: extendApi(z.string().min(1).max(100), {
      description: '资源标识',
      example: 'auth',
    }),
    resourceId: extendApi(z.string().max(100).nullish(), {
      description: '资源主键(字符串化)',
      example: '123',
    }),
    ip: extendApi(z.string().max(64).nullish(), {
      description: '来源 IP',
      example: '127.0.0.1',
    }),
    userAgent: extendApi(z.string().max(500).nullish(), {
      description: 'User-Agent',
      example: 'Mozilla/5.0 ...',
    }),
    statusCode: extendApi(z.coerce.number().int().nullish(), {
      description: 'HTTP 状态码',
      example: 200,
    }),
    duration: extendApi(z.coerce.number().int().nonnegative().nullish(), {
      description: '耗时(毫秒)',
      example: 35,
    }),
    metadata: extendApi(z.record(z.any()).nullish(), {
      description: '附加元数据',
    }),
    timestamp: extendApi(z.coerce.date(), {
      description: '事件时间',
      example: '2026-05-04T10:00:00.000Z',
    }),
  }),
  { title: 'SaveAuditEventDto', description: '记录审计日志请求参数' },
);

export type SaveAuditEventDto = z.infer<typeof saveAuditEventSchema>;
