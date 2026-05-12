import { OrganizationEntity } from '../../domain/entities/organization.entity';

export class OrganizationMapper {
  static toDomain(row: any): OrganizationEntity {
    return new OrganizationEntity({
      id: row.id,
      parentId: row.parentId,
      code: row.code,
      name: row.name,
      type: row.type as any,
      leaderId: row.leaderId,
      sortOrder: row.sortOrder ?? 0,
      description: row.description,
      status: row.status as any,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(entity: OrganizationEntity): any {
    return {
      parentId: entity.parentId ?? null,
      code: entity.code,
      name: entity.name,
      type: entity.type,
      leaderId: entity.leaderId ?? null,
      sortOrder: entity.sortOrder,
      description: entity.description ?? null,
      status: entity.status,
    };
  }
}
