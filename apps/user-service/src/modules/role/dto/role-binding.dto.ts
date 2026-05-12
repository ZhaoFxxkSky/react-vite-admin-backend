import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';

export const assignRoleUsersSchema = extendApi(
  z.object({
    roleId: extendApi(z.coerce.number().int(), {
      description: '角色 id',
      example: 1,
    }),
    userIds: extendApi(z.array(z.coerce.number().int()).min(1), {
      description: '用户 id 列表',
      example: [1, 2, 3],
    }),
  }),
  {
    title: 'AssignRoleUsersDto',
    description: '批量给角色分配/撤销用户',
  },
);

export type AssignRoleUsersDto = z.infer<typeof assignRoleUsersSchema>;

export const setRolePermissionsSchema = extendApi(
  z.object({
    roleId: extendApi(z.coerce.number().int(), {
      description: '角色 id',
      example: 1,
    }),
    permissionIds: extendApi(z.array(z.coerce.number().int()), {
      description: '权限 id 列表(全量覆盖,空数组表示清空)',
      example: [1, 2, 3],
    }),
  }),
  {
    title: 'SetRolePermissionsDto',
    description: '设置角色的权限(全量覆盖)',
  },
);

export type SetRolePermissionsDto = z.infer<typeof setRolePermissionsSchema>;

export const setRoleApiPermissionsSchema = extendApi(
  z.object({
    roleId: extendApi(z.coerce.number().int(), {
      description: '角色 id',
      example: 1,
    }),
    apiPermissionIds: extendApi(z.array(z.coerce.number().int()), {
      description: '接口权限 id 列表(全量覆盖,空数组表示清空)',
      example: [1, 2, 3],
    }),
  }),
  {
    title: 'SetRoleApiPermissionsDto',
    description: '设置角色的接口权限(全量覆盖)',
  },
);

export type SetRoleApiPermissionsDto = z.infer<typeof setRoleApiPermissionsSchema>;
