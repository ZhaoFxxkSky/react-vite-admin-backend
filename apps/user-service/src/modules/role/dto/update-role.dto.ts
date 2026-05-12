import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';
import { idSchema } from '@shared';

export const updateRoleSchema = extendApi(
  idSchema.merge(
    z.object({
      name: extendApi(z.string().min(1).max(50).optional(), {
        description: '角色名称',
        example: '管理员',
      }),
      description: extendApi(z.string().max(500).nullish(), {
        description: '角色描述',
        example: '系统管理员',
      }),
      level: extendApi(z.coerce.number().int().optional(), {
        description: '角色权重',
        example: 1,
      }),
      status: extendApi(z.enum(['active', 'inactive']).optional(), {
        description: '角色状态',
        example: 'active',
      }),
      permissionIds: extendApi(z.array(z.coerce.number().int()).optional(), {
        description: '关联的权限 id 列表(全量覆盖)',
        example: [1, 2, 3],
      }),
    }),
  ) as any,
  { title: 'UpdateRoleDto', description: '更新角色请求参数' },
);

export type UpdateRoleDto = z.infer<typeof updateRoleSchema>;
