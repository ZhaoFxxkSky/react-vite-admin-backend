import { ConfigEntity } from '../../domain/entities/config.entity';

export class ConfigMapper {
  static toDomain(row: any): ConfigEntity {
    return new ConfigEntity({
      id: row.id,
      key: row.key,
      value: row.value,
      type: row.type as any,
      group: row.group ?? 'system',
      name: row.name,
      description: row.description,
      isBuiltIn: row.isBuiltIn ?? false,
      status: row.status as any,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(entity: ConfigEntity): any {
    return {
      key: entity.key,
      value: entity.value,
      type: entity.type,
      group: entity.group ?? 'system',
      name: entity.name,
      description: entity.description ?? null,
      isBuiltIn: entity.isBuiltIn,
      status: entity.status,
    };
  }
}
