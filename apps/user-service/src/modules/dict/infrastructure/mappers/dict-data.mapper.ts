import { DictDataEntity } from '../../domain/entities/dict-data.entity';

export class DictDataMapper {
  static toDomain(row: any): DictDataEntity {
    return new DictDataEntity({
      id: row.id,
      dictId: row.dictId,
      label: row.label,
      value: row.value,
      sortOrder: row.sortOrder ?? 0,
      status: row.status as any,
      remark: row.remark,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(entity: DictDataEntity): any {
    return {
      dictId: entity.dictId,
      label: entity.label,
      value: entity.value,
      sortOrder: entity.sortOrder,
      status: entity.status,
      remark: entity.remark ?? null,
    };
  }
}
