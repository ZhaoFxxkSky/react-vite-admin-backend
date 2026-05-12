import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';

export const toggleSchema = extendApi(
  z.object({
    id: extendApi(z.coerce.number().int(), {
      description: '接口权限 id',
      example: 1,
    }),
    enabled: extendApi(z.boolean(), {
      description: '是否启用',
      example: true,
    }),
  }),
  {
    title: 'ToggleDto',
    description: '启停单个接口权限',
  },
);

export type ToggleDto = z.infer<typeof toggleSchema>;

export const batchToggleSchema = extendApi(
  z.object({
    ids: extendApi(z.array(z.coerce.number().int()).min(1), {
      description: '接口权限 id 列表',
      example: [1, 2, 3],
    }),
    enabled: extendApi(z.boolean(), {
      description: '是否启用',
      example: true,
    }),
  }),
  {
    title: 'BatchToggleDto',
    description: '批量启停接口权限',
  },
);

export type BatchToggleDto = z.infer<typeof batchToggleSchema>;
