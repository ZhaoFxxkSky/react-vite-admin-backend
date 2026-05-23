import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';
import { idSchema } from '@shared';

export const resetPasswordByIdSchema = extendApi(
  idSchema.merge(
    z.object({
      newPassword: extendApi(z.string().min(8).max(100), {
        description: '新密码',
        example: 'Reset123!',
      }),
    }),
  ),
  {
    title: 'ResetPasswordByIdDto',
    description: '管理员重置用户密码请求参数',
  },
);

export type ResetPasswordByIdDto = z.infer<typeof resetPasswordByIdSchema>;

export const changeUserStatusSchema = extendApi(
  idSchema.merge(
    z.object({
      status: extendApi(z.enum(['active', 'inactive', 'banned', 'locked']), {
        description: '目标状态',
        example: 'active',
      }),
    }),
  ),
  {
    title: 'ChangeUserStatusDto',
    description: '修改用户状态请求参数',
  },
);

export type ChangeUserStatusDto = z.infer<typeof changeUserStatusSchema>;

export const setUserRolesSchema = extendApi(
  z.object({
    userId: extendApi(z.coerce.number().int(), {
      description: '用户 id',
      example: 1,
    }),
    roleIds: extendApi(z.array(z.coerce.number().int()), {
      description: '角色 id 列表(全量覆盖,空数组表示清空)',
      example: [1, 2],
    }),
  }),
  {
    title: 'SetUserRolesDto',
    description: '设置用户角色(全量覆盖)',
  },
);

export type SetUserRolesDto = z.infer<typeof setUserRolesSchema>;
