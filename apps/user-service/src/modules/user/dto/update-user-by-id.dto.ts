import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';
import { idSchema } from '@shared';

/**
 * 管理员更新用户的 DTO(可修改全部资料字段、组织、状态等;不含密码)
 */
export const updateUserByIdSchema = extendApi(
  idSchema.merge(
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
      }),
      nickName: extendApi(z.string().max(50).nullish(), {
        description: '昵称',
      }),
      avatar: extendApi(z.string().max(500).nullish(), {
        description: '头像URL',
      }),
      gender: extendApi(z.enum(['male', 'female', 'unknown']).nullish(), {
        description: '性别',
      }),
      birthday: extendApi(z.coerce.date().nullish(), {
        description: '生日(YYYY-MM-DD)',
      }),
      employeeNo: extendApi(z.string().max(50).nullish(), {
        description: '工号',
      }),
      jobTitle: extendApi(z.string().max(50).nullish(), {
        description: '职位',
      }),
      organizationId: extendApi(z.coerce.number().int().nullish(), {
        description: '主组织 id',
      }),
      extraOrgIds: extendApi(z.array(z.coerce.number().int()).nullish(), {
        description: '额外关联组织 id 列表(全量覆盖)',
      }),
      isSuperAdmin: extendApi(z.boolean().optional(), {
        description: '是否超级管理员(仅现有超管可改)',
      }),
      status: extendApi(
        z.enum(['active', 'inactive', 'banned', 'locked']).nullish(),
        { description: '用户状态' },
      ),
    }),
  ) as any,
  { title: 'UpdateUserByIdDto', description: '管理员更新用户请求参数' },
);

export type UpdateUserByIdDto = z.infer<typeof updateUserByIdSchema>;
