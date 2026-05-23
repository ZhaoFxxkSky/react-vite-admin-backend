import { DictTypeEntity } from '../../domain/entities/dict-type.entity';

export class DictTypeMapper {
  static toDomain(row: any): DictTypeEntity {
    return new DictTypeEntity({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      status: row.status as any,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(entity: DictTypeEntity): any {
    return {
      code: entity.code,
      name: entity.name,
      description: entity.description ?? null,
      status: entity.status,
    };
  }
}
