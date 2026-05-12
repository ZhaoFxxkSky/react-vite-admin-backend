import { PermissionEntity } from '../entities/permission.entity';
import { PaginatedResponse } from '@shared';

export interface ListPermissionByPageQuery {
  current: number;
  pageSize: number;
  type?: string | null;
  keyword?: string | null;
}

export interface IPermissionRepository {
  getById(id: number): Promise<PermissionEntity | null>;
  getByCode(code: string): Promise<PermissionEntity | null>;
  list(): Promise<PermissionEntity[]>;
  listByPage(
    query: ListPermissionByPageQuery,
  ): Promise<PaginatedResponse<PermissionEntity>>;
  save(entity: PermissionEntity): Promise<PermissionEntity>;
  updateById(
    id: number,
    patch: Partial<PermissionEntity>,
  ): Promise<PermissionEntity | null>;
  removeById(id: number): Promise<void>;
}
