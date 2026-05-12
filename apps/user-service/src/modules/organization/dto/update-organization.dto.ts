import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';
import { idSchema } from '@shared';

export const updateOrganizationSchema = extendApi(
  idSchema.merge(
    z.object({
      parentId: extendApi(z.coerce.number().int().nullish(), {
        description: '父级组织 id;为空表示根节点',
        example: null,
      }),
      code: extendApi(
        z
          .string()
          .min(1)
          .max(64)
          .regex(/^[a-zA-Z0-9_-]+$/)
          .optional(),
        { description: '组织编码', example: 'hq' },
      ),
      name: extendApi(z.string().min(1).max(100).optional(), {
        description: '组织名称',
        example: '总部',
      }),
      type: extendApi(
        z.enum(['company', 'department', 'team', 'group']).optional(),
        { description: '组织类型', example: 'department' },
      ),
      leaderId: extendApi(z.coerce.number().int().nullish(), {
        description: '负责人用户 id',
        example: 1,
      }),
      sortOrder: extendApi(z.coerce.number().int().optional(), {
        description: '排序权重',
        example: 0,
      }),
      description: extendApi(z.string().max(255).nullish(), {
        description: '描述',
      }),
      status: extendApi(z.enum(['active', 'inactive']).optional(), {
        description: '状态',
        example: 'active',
      }),
    }),
  ) as any,
  { title: 'UpdateOrganizationDto', description: '更新组织请求参数' },
);

export type UpdateOrganizationDto = z.infer<typeof updateOrganizationSchema>;
