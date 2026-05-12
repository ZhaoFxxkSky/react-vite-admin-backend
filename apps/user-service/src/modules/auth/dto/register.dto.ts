import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';

export const registerSchema = extendApi(
  z.object({
    username: extendApi(
      z
        .string()
        .min(3)
        .max(50)
        .regex(/^[a-zA-Z0-9_]+$/, '只能包含字母、数字、下划线'),
      {
        description: '用户名',
        example: 'zhangsan',
      },
    ),
    email: extendApi(z.string().email().nullish(), {
      description: '邮箱',
      example: 'zhangsan@example.com',
    }),
    phone: extendApi(
      z
        .string()
        .regex(/^1[3-9]\d{9}$/, '手机号格式错误')
        .nullish(),
      {
        description: '手机号',
        example: '13800138000',
      },
    ),
    password: extendApi(
      z
        .string()
        .min(8)
        .max(100)
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '需包含大小写字母和数字'),
      {
        description: '密码',
        example: 'Secure123!',
      },
    ),
    nickName: extendApi(z.string().max(50).nullish(), {
      description: '昵称',
      example: '张三',
    }),
  }),
  { title: 'RegisterDto', description: '注册请求参数' },
);

export type RegisterDto = z.infer<typeof registerSchema>;
