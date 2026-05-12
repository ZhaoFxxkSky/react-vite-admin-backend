import { extendApi } from '@anatine/zod-openapi';
import z from 'zod';

/**
 * 通用 id 字段,可被其他 schema 通过 .merge() 合并使用。
 * 例如:`createXxxSchema.merge(idSchema)` → 既包含 id 又包含创建字段。
 */
export const idSchema = z.object({
  id: extendApi(z.coerce.number().int().positive(), {
    description: '主键 id',
    example: 1,
  }),
});

/**
 * 仅含 id 的删除请求 schema(`POST /xxx/removeById` 用)。
 */
export const removeByIdSchema = extendApi(idSchema, {
  title: 'RemoveByIdDto',
  description: '根据 id 删除请求参数',
});

export type RemoveByIdDto = z.infer<typeof removeByIdSchema>;
