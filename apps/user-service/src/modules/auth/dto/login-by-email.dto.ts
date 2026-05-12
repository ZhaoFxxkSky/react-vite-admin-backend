import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';

export const loginByEmailSchema = extendApi(
  z.object({
    email: extendApi(z.string().email().min(1).max(100), {
      description: '邮箱',
      example: 'zhangsan@example.com',
    }),
    password: extendApi(z.string().min(1), {
      description: '密码',
      example: 'Secure123!',
    }),
  }),
  { title: 'LoginByEmailDto', description: '邮箱登录请求参数' },
);

export type LoginByEmailDto = z.infer<typeof loginByEmailSchema>;
