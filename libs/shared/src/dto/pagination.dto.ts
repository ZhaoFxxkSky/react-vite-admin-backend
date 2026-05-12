import { extendApi } from '@anatine/zod-openapi';
import z from 'zod';

export const paginationSchema = z.object({
  current: extendApi(z.coerce.number().min(1).default(1), {
    description: '当前页码',
    example: 1,
  }),
  pageSize: extendApi(z.coerce.number().min(1).max(1000).default(10), {
    description: '每页数量',
    example: 10,
  }),
});

export class PaginationMeta {
  total: number;
  current: number;
  pageSize: number;
  totalPages: number;

  constructor(total: number, current: number, pageSize: number) {
    this.total = total;
    this.current = current;
    this.pageSize = pageSize;
    this.totalPages = Math.ceil(total / pageSize);
  }
}

export class PaginatedResponse<T> {
  list: T[];
  meta: PaginationMeta;

  constructor(list: T[], total: number, current: number, pageSize: number) {
    this.list = list;
    this.meta = new PaginationMeta(total, current, pageSize);
  }
}
