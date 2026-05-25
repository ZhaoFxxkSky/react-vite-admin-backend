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
    captchaKey: extendApi(z.string().optional(), {
      description: '验证码key',
      example: 'captcha:123456:abc123',
    }),
    captchaCode: extendApi(z.string().optional(), {
      description: '验证码',
      example: 'a1b2',
    }),
    rememberMe: extendApi(z.boolean().optional(), {
      description: '记住我（30天）',
      example: true,
    }),
  }),
  { title: 'LoginDto', description: '登录请求参数' },
);

export type LoginDto = z.infer<typeof loginSchema>;
