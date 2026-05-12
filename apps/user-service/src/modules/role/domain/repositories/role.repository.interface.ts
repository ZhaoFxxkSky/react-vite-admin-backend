import { RoleEntity } from '../entities/role.entity';
import { PaginatedResponse } from '@shared';

export interface ListRoleByPageQuery {
  current: number;
  pageSize: number;
  type?: string | null;
  status?: string | null;
  keyword?: string | null;
}

export interface IRoleRepository {
  getById(id: number): Promise<RoleEntity | null>;
  getByCode(code: string): Promise<RoleEntity | null>;
  list(params?: { type?: string; status?: string }): Promise<RoleEntity[]>;
  listByPage(query: ListRoleByPageQuery): Promise<PaginatedResponse<RoleEntity>>;
  save(entity: RoleEntity): Promise<RoleEntity>;
  updateById(id: number, data: Partial<RoleEntity>): Promise<RoleEntity>;
  removeById(id: number): Promise<void>;
}
