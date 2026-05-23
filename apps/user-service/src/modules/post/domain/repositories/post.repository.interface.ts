import { PostEntity } from '../entities/post.entity';
import { PaginatedResponse } from '@shared';

export interface ListPostByPageQuery {
  current: number;
  pageSize: number;
  status?: string | null;
  keyword?: string | null;
}

export interface IPostRepository {
  getById(id: number): Promise<PostEntity | null>;
  getByCode(code: string): Promise<PostEntity | null>;
  list(params?: { status?: string }): Promise<PostEntity[]>;
  listByPage(
    query: ListPostByPageQuery,
  ): Promise<PaginatedResponse<PostEntity>>;
  save(entity: PostEntity): Promise<PostEntity>;
  updateById(id: number, data: Partial<PostEntity>): Promise<PostEntity>;
  removeById(id: number): Promise<void>;
}
