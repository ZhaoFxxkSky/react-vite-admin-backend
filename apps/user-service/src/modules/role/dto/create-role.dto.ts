import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';

export const createRoleSchema = extendApi(
  z.object({
    name: extendApi(z.string().min(1).max(50), {
      description: '角色名称',
      example: '管理员',
    }),
    code: extendApi(
      z
        .string()
        .min(1)
        .max(50)
        .regex(/^[a-zA-Z0-9_:-]+$/),
      { description: '角色编码(全局唯一)', example: 'admin' },
    ),
    description: extendApi(z.string().max(500).nullish(), {
      description: '角色描述',
      example: '系统管理员',
    }),
    type: extendApi(z.enum(['system', 'custom']).default('custom').optional(), {
      description: '角色类型',
      example: 'custom',
    }),
    level: extendApi(z.coerce.number().int().default(1).optional(), {
      description: '角色权重',
      example: 1,
    }),
    permissionIds: extendApi(z.array(z.coerce.number().int()).nullish(), {
      description: '关联的权限 id 列表',
      example: [1, 2, 3],
    }),
  }),
  { title: 'CreateRoleDto', description: '创建角色请求参数' },
);

export type CreateRoleDto = z.infer<typeof createRoleSchema>;
