import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';

export const createUserSchema = extendApi(
  z.object({
    username: extendApi(
      z
        .string()
        .min(3)
        .max(50)
        .regex(/^[a-zA-Z0-9_]+$/),
      { description: '用户名(全局唯一)', example: 'john_doe' },
    ),
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
    password: extendApi(z.string().min(8).max(100), {
      description: '密码',
      example: 'Secure123!',
    }),
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
    gender: extendApi(
      z.enum(['male', 'female', 'unknown']).default('unknown').optional(),
      { description: '性别', example: 'male' },
    ),
    birthday: extendApi(z.coerce.date().nullish(), {
      description: '生日(YYYY-MM-DD)',
      example: '1990-01-01',
    }),
    employeeNo: extendApi(z.string().max(50).nullish(), {
      description: '工号',
      example: 'E0001',
    }),
    jobTitle: extendApi(z.string().max(50).nullish(), {
      description: '职位',
      example: '高级工程师',
    }),
    organizationId: extendApi(z.coerce.number().int().nullish(), {
      description: '主组织 id',
      example: 1,
    }),
    extraOrgIds: extendApi(z.array(z.coerce.number().int()).nullish(), {
      description: '额外关联组织 id 列表',
      example: [2, 3],
    }),
    roleIds: extendApi(z.array(z.coerce.number().int()).nullish(), {
      description: '角色 id 列表',
      example: [1, 2],
    }),
    isSuperAdmin: extendApi(z.boolean().default(false).optional(), {
      description: '是否超级管理员(仅现有超管可设为 true)',
      example: false,
    }),
    status: extendApi(
      z.enum(['active', 'inactive', 'banned', 'locked']).nullish(),
      {
        description: '用户状态',
        example: 'active',
      },
    ),
  }),
  { title: 'CreateUserDto', description: '创建用户请求参数' },
);

export type CreateUserDto = z.infer<typeof createUserSchema>;
