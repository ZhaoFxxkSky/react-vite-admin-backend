import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';

export const createPermissionSchema = extendApi(
  z.object({
    pid: extendApi(z.coerce.number().int().nonnegative().nullish(), {
      description: '父权限 id(0 表示根)',
      example: 0,
    }),
    code: extendApi(z.string().min(1).max(100), {
      description: '权限编码,全局唯一',
      example: 'user:read',
    }),
    name: extendApi(z.string().max(100).nullish(), {
      description: '权限名称',
      example: '查询用户',
    }),
    type: extendApi(
      z
        .enum(['catalog', 'menu', 'embedded', 'link', 'button'])
        .default('menu')
        .optional(),
      {
        description: '权限类型',
        example: 'menu',
      },
    ),
    path: extendApi(z.string().max(255).nullish(), {
      description: '前端路由路径',
      example: '/user/list',
    }),
    component: extendApi(z.string().max(255).nullish(), {
      description: '前端组件路径',
      example: 'views/user/List',
    }),
    redirect: extendApi(z.string().max(255).nullish(), {
      description: '重定向路径',
      example: '/user/list',
    }),
    handle: extendApi(z.record(z.any()).nullish(), {
      description: '前端菜单元数据(图标、标题等)',
    }),
    sortOrder: extendApi(z.coerce.number().int().default(0).optional(), {
      description: '排序号',
      example: 0,
    }),
    isSensitive: extendApi(z.boolean().default(false).optional(), {
      description: '是否敏感权限',
      example: false,
    }),
    status: extendApi(
      z.enum(['active', 'inactive']).default('active').optional(),
      {
        description: '权限状态',
        example: 'active',
      },
    ),
    isBuiltIn: extendApi(z.boolean().default(false).optional(), {
      description: '是否内置权限(内置权限不可删除)',
      example: false,
    }),
    description: extendApi(z.string().max(255).nullish(), {
      description: '权限描述',
      example: '可以查询用户列表',
    }),
  }),
  { title: 'CreatePermissionDto', description: '创建权限请求参数' },
);

export type CreatePermissionDto = z.infer<typeof createPermissionSchema>;
