import { PaginatedResponse } from '@shared';
import { UserEntity } from '../entities/user.entity';

export interface ListUserByPageQuery {
  current: number;
  pageSize: number;
  keyword?: string | null;
  status?: string | null;
}

export interface IUserRepository {
  getById(id: number): Promise<UserEntity | null>;
  getByUsername(username: string): Promise<UserEntity | null>;
  getByEmail(email: string): Promise<UserEntity | null>;
  getByPhone(phone: string): Promise<UserEntity | null>;
  getByAccount(account: string): Promise<UserEntity | null>;
  listByPage(params: ListUserByPageQuery): Promise<PaginatedResponse<UserEntity>>;
  save(entity: UserEntity): Promise<UserEntity>;
  updateById(id: number, data: Partial<UserEntity>): Promise<UserEntity>;
  removeById(id: number): Promise<void>;
}
