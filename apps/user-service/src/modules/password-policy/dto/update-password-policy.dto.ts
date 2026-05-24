import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';

export const updatePasswordPolicySchema = extendApi(
  z.object({
    minLength: extendApi(z.number().int().min(1).max(128).optional(), {
      description: '最小长度',
      example: 8,
    }),
    maxLength: extendApi(z.number().int().min(1).max(128).optional(), {
      description: '最大长度',
      example: 32,
    }),
    requireUppercase: extendApi(z.boolean().optional(), {
      description: '要求大写字母',
      example: true,
    }),
    requireLowercase: extendApi(z.boolean().optional(), {
      description: '要求小写字母',
      example: true,
    }),
    requireNumbers: extendApi(z.boolean().optional(), {
      description: '要求数字',
      example: true,
    }),
    requireSymbols: extendApi(z.boolean().optional(), {
      description: '要求特殊字符',
      example: false,
    }),
    expiryDays: extendApi(z.number().int().min(0).max(365).optional(), {
      description: '密码过期天数(0表示不过期)',
      example: 90,
    }),
    historyCount: extendApi(z.number().int().min(0).max(50).optional(), {
      description: '历史密码保留数量',
      example: 5,
    }),
    maxLoginAttempts: extendApi(z.number().int().min(0).max(100).optional(), {
      description: '最大登录失败次数',
      example: 5,
    }),
    lockoutDuration: extendApi(z.number().int().min(0).max(1440).optional(), {
      description: '锁定持续时间(分钟)',
      example: 30,
    }),
  }),
  { title: 'UpdatePasswordPolicyDto', description: '更新密码策略请求参数' },
);

export type UpdatePasswordPolicyDto = z.infer<
  typeof updatePasswordPolicySchema
>;
