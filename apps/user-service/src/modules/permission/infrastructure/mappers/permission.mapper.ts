import {
  PermissionEntity,
  PermissionMeta,
} from '../../domain/entities/permission.entity';

export class PermissionMapper {
  static toDomain(row: any): PermissionEntity {
    return new PermissionEntity({
      id: row.id,
      pid: row.pid ?? 0,
      code: row.code,
      type: row.type as any,
      name: row.name ?? null,
      path: row.path ?? null,
      component: row.component ?? null,
      redirect: row.redirect ?? null,
      handle: (row.handle as PermissionMeta | null) ?? null,
      sortOrder: row.sortOrder ?? 0,
      isSensitive: row.isSensitive ?? false,
      status: row.status as any,
      isBuiltIn: row.isBuiltIn ?? false,
      description: row.description ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(entity: PermissionEntity): any {
    return {
      pid: entity.pid ?? 0,
      code: entity.code,
      type: entity.type,
      name: entity.name,
      path: entity.path,
      component: entity.component,
      redirect: entity.redirect,
      handle: entity.handle,
      sortOrder: entity.sortOrder ?? 0,
      isSensitive: entity.isSensitive ?? false,
      status: entity.status ?? 'active',
      isBuiltIn: entity.isBuiltIn ?? false,
      description: entity.description,
    };
  }
}
