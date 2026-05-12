import { RoleEntity } from '../../domain/entities/role.entity';

export class RoleMapper {
  static toDomain(row: any): RoleEntity {
    return new RoleEntity({
      id: row.id,
      name: row.name,
      code: row.code,
      description: row.description,
      type: row.type as any,
      level: row.level ?? 1,
      status: row.status as any,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(entity: RoleEntity): any {
    return {
      name: entity.name,
      code: entity.code,
      description: entity.description ?? null,
      type: entity.type,
      level: entity.level,
      status: entity.status,
    };
  }
}
