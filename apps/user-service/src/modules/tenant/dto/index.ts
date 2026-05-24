import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';

export const createTenantSchema = extendApi(
  z.object({
    name: extendApi(z.string().min(1).max(100), {
      description: '租户名称',
      example: 'Acme Corporation',
    }),
    code: extendApi(z.string().min(3).max(50).regex(/^[a-z0-9-]+$/), {
      description: '租户编码（唯一，小写+数字+横线）',
      example: 'acme-corp',
    }),
    description: extendApi(z.string().max(255).nullish(), {
      description: '描述',
    }),
  }),
  { title: 'CreateTenantDto', description: '创建租户' },
);

export type CreateTenantDto = z.infer<typeof createTenantSchema>;

export const inviteMemberSchema = extendApi(
  z.object({
    userId: extendApi(z.coerce.number().min(1), {
      description: '用户ID',
    }),
    role: extendApi(z.enum(['owner', 'admin', 'member']).default('member'), {
      description: '角色',
    }),
  }),
  { title: 'InviteMemberDto', description: '邀请成员' },
);

export type InviteMemberDto = z.infer<typeof inviteMemberSchema>;

export const listTenantSchema = extendApi(
  z.object({
    current: extendApi(z.coerce.number().min(1).default(1), {
      description: '当前页',
    }),
    pageSize: extendApi(z.coerce.number().min(1).max(100).default(20), {
      description: '每页条数',
    }),
  }),
  { title: 'ListTenantDto', description: '查询租户列表' },
);

export type ListTenantDto = z.infer<typeof listTenantSchema>;
