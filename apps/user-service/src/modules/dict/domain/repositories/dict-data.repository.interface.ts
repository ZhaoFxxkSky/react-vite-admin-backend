import { DictDataEntity } from '../entities/dict-data.entity';
import { PaginatedResponse } from '@shared';

export interface ListDictDataByPageQuery {
  current: number;
  pageSize: number;
  dictId?: number | null;
  status?: string | null;
  keyword?: string | null;
}

export interface IDictDataRepository {
  getById(id: number): Promise<DictDataEntity | null>;
  list(params?: {
    dictId?: number;
    status?: string;
  }): Promise<DictDataEntity[]>;
  listByPage(
    query: ListDictDataByPageQuery,
  ): Promise<PaginatedResponse<DictDataEntity>>;
  save(entity: DictDataEntity): Promise<DictDataEntity>;
  updateById(
    id: number,
    data: Partial<DictDataEntity>,
  ): Promise<DictDataEntity>;
  removeById(id: number): Promise<void>;
}
