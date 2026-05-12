import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';

export const loginByPhoneSchema = extendApi(
  z.object({
    phone: extendApi(z.string().min(1).max(20), {
      description: '手机号',
      example: '13800138000',
    }),
    password: extendApi(z.string().min(1), {
      description: '密码',
      example: 'Secure123!',
    }),
  }),
  { title: 'LoginByPhoneDto', description: '手机号登录请求参数' },
);

export type LoginByPhoneDto = z.infer<typeof loginByPhoneSchema>;
