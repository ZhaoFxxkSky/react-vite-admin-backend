import { ConfigEntity } from '../entities/config.entity';

export interface IConfigRepository {
  getById(id: number): Promise<ConfigEntity | null>;
  getByKey(key: string): Promise<ConfigEntity | null>;
  list(params?: { group?: string; status?: string }): Promise<ConfigEntity[]>;
  listAll(): Promise<ConfigEntity[]>;
  save(entity: ConfigEntity): Promise<ConfigEntity>;
  updateById(id: number, data: Partial<ConfigEntity>): Promise<ConfigEntity>;
  removeById(id: number): Promise<void>;
}
