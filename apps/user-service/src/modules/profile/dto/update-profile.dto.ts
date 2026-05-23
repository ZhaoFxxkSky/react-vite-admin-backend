import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';

export const updateProfileSchema = extendApi(
  z.object({
    nickName: extendApi(z.string().max(50).nullish(), {
      description: '昵称',
      example: '张三',
    }),
    email: extendApi(z.string().email().nullish(), {
      description: '邮箱',
      example: 'zhangsan@example.com',
    }),
    phone: extendApi(
      z.string().regex(/^1[3-9]\d{9}$/).nullish(),
      { description: '手机号', example: '13800138000' },
    ),
    realName: extendApi(z.string().max(50).nullish(), {
      description: '真实姓名',
      example: '张三',
    }),
    gender: extendApi(z.enum(['male', 'female', 'unknown']).nullish(), {
      description: '性别',
      example: 'male',
    }),
    birthday: extendApi(z.coerce.date().nullish(), {
      description: '生日(YYYY-MM-DD)',
      example: '1990-01-01',
    }),
  }),
  { title: 'UpdateProfileDto', description: '更新个人资料' },
);

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
