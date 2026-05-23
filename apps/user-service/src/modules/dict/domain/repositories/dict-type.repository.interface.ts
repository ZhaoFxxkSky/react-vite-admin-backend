import { DictTypeEntity } from '../entities/dict-type.entity';
import { PaginatedResponse } from '@shared';

export interface ListDictTypeByPageQuery {
  current: number;
  pageSize: number;
  status?: string | null;
  keyword?: string | null;
}

export interface IDictTypeRepository {
  getById(id: number): Promise<DictTypeEntity | null>;
  getByCode(code: string): Promise<DictTypeEntity | null>;
  list(params?: { status?: string }): Promise<DictTypeEntity[]>;
  listByPage(
    query: ListDictTypeByPageQuery,
  ): Promise<PaginatedResponse<DictTypeEntity>>;
  save(entity: DictTypeEntity): Promise<DictTypeEntity>;
  updateById(
    id: number,
    data: Partial<DictTypeEntity>,
  ): Promise<DictTypeEntity>;
  removeById(id: number): Promise<void>;
}
