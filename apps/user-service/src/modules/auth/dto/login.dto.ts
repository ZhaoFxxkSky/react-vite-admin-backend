import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';

export const loginSchema = extendApi(
  z.object({
    username: extendApi(z.string().min(1).max(100), {
      description: '用户名',
      example: 'zhangsan',
    }),
    password: extendApi(z.string().min(1), {
      description: '密码',
      example: 'Secure123!',
    }),
  }),
  { title: 'LoginDto', description: '登录请求参数' },
);

export type LoginDto = z.infer<typeof loginSchema>;
