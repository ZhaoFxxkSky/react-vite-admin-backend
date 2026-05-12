import { extendApi } from '@anatine/zod-openapi';
import { z } from 'zod';
import { paginationSchema } from '@shared';

export const listOnlineSchema = extendApi(
  paginationSchema.merge(
    z.object({
      keyword: extendApi(z.string().nullish(), {
        description: '关键字(匹配用户名/真实姓名/昵称)',
        example: 'zhangsan',
      }),
    }),
  ),
  { title: 'ListOnlineDto', description: '分页查询在线用户请求参数' },
);

export type ListOnlineDto = z.infer<typeof listOnlineSchema>;
