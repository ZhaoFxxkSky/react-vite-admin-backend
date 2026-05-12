import { extendApi } from '@anatine/zod-openapi';
import { z } from 'zod';

const actionEnum = z.enum([
  'view',
  'create',
  'update',
  'delete',
  'export',
  'approve',
  'assign',
]);

const scopeEnum = z.enum([
  'ALL',
  'ORG_AND_CHILD',
  'ORG',
  'SELF',
  'CUSTOM',
  'NONE',
]);

const dimensionEnum = z.literal('DEPT').default('DEPT');

const scopeItemSchema = z.object({
  action: extendApi(actionEnum, {
    description: '操作类型',
    example: 'view',
  }),
  scope: extendApi(scopeEnum, {
    description: '数据范围',
    example: 'ORG',
  }),
  dimension: extendApi(dimensionEnum, {
    description: '数据维度（当前仅支持 DEPT）',
    example: 'DEPT',
  }),
  customTargets: extendApi(z.array(z.number().int()).nullish(), {
    description: '自定义目标列表（仅 CUSTOM 范围，内容由 dimension 决定语义）',
    example: [1, 2],
  }),
});

const resourceItemSchema = z.object({
  resourceCode: extendApi(z.string().min(1), {
    description: '资源编码',
    example: 'system:user',
  }),
  enabled: extendApi(z.boolean().default(true), {
    description: '是否启用该资源的数据权限配置（false 时保留配置但生效降级为 ALL）',
    example: true,
  }),
  scopes: z.array(scopeItemSchema),
});

export const saveRoleScopesSchema = extendApi(
  z.object({
    roleId: extendApi(z.coerce.number().int(), {
      description: '角色ID',
      example: 1,
    }),
    resources: z
      .array(resourceItemSchema)
      .refine(
        (arr) => {
          const codes = arr.map((r) => r.resourceCode);
          return new Set(codes).size === codes.length;
        },
        { message: 'resourceCode 不能重复' },
      ),
  }),
  {
    title: 'SaveRoleScopesDto',
    description: '保存角色数据权限配置请求（按资源分组）',
  },
);

export type SaveRoleScopesDto = z.infer<typeof saveRoleScopesSchema>;
