import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';

export const createOrganizationSchema = extendApi(
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
        .regex(/^[a-zA-Z0-9_-]+$/),
      { description: '组织编码(全局唯一)', example: 'hq' },
    ),
    name: extendApi(z.string().min(1).max(100), {
      description: '组织名称',
      example: '总部',
    }),
    type: extendApi(
      z.enum(['company', 'department', 'team', 'group']).default('department'),
      { description: '组织类型', example: 'company' },
    ),
    leaderId: extendApi(z.coerce.number().int().nullish(), {
      description: '负责人用户 id',
      example: 1,
    }),
    sortOrder: extendApi(z.coerce.number().int().default(0), {
      description: '排序权重',
      example: 0,
    }),
    description: extendApi(z.string().max(255).nullish(), {
      description: '描述',
      example: '公司总部',
    }),
  }),
  { title: 'CreateOrganizationDto', description: '创建组织请求参数' },
);

export type CreateOrganizationDto = z.infer<typeof createOrganizationSchema>;
