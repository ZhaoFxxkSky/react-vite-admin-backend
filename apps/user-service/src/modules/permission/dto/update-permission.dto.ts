import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';
import { idSchema } from '@shared';
import { createPermissionSchema } from './create-permission.dto';

/**
 * 更新权限请求参数:全部字段可选。
 */
export const updatePermissionSchema = extendApi(
  idSchema.merge(createPermissionSchema.partial()),
  { title: 'UpdatePermissionDto', description: '更新权限请求参数' },
);

export type UpdatePermissionDto = z.infer<typeof updatePermissionSchema>;
