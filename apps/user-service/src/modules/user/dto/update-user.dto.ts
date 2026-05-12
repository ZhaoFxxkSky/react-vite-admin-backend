import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';

/**
 * 个人中心更新接口的 DTO(仅允许修改个人资料字段)
 */
export const updateUserSchema = extendApi(
  z.object({
    email: extendApi(z.string().email().nullish(), {
      description: '邮箱',
      example: 'john@example.com',
    }),
    phone: extendApi(
      z
        .string()
        .regex(/^1[3-9]\d{9}$/)
        .nullish(),
      { description: '手机号', example: '13800138000' },
    ),
    realName: extendApi(z.string().max(50).nullish(), {
      description: '真实姓名',
      example: '张三',
    }),
    nickName: extendApi(z.string().max(50).nullish(), {
      description: '昵称',
      example: 'John',
    }),
    avatar: extendApi(z.string().max(500).nullish(), {
      description: '头像URL',
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
  { title: 'UpdateUserDto', description: '更新个人资料请求参数' },
);

export type UpdateUserDto = z.infer<typeof updateUserSchema>;
