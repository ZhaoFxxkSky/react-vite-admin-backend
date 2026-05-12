import { extendApi } from '@anatine/zod-openapi';
import { paginationSchema } from '@shared';
import z from 'zod';

export const listFileSchema = extendApi(paginationSchema, {
  title: 'ListFileDto',
  description: '查询文件列表请求参数',
});

export type ListFileDto = z.infer<typeof listFileSchema>;
