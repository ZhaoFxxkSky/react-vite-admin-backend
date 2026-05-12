import { extendApi } from '@anatine/zod-openapi';
import { z } from 'zod';
import { paginationSchema } from '@shared';

export const listUserByPageSchema = extendApi(
  paginationSchema.merge(
    z.object({
      keyword: extendApi(z.string().nullish(), {
        description: '关键字(匹配用户名/真实姓名/昵称/邮箱/手机号)',
        example: '张三',
      }),
      status: extendApi(
        z.enum(['active', 'inactive', 'banned', 'locked']).nullish(),
        { description: '用户状态' },
      ),
    }),
  ),
  { title: 'ListUserByPageDto', description: '分页查询用户请求参数' },
);

export type ListUserByPageDto = z.infer<typeof listUserByPageSchema>;
