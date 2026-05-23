import { PostEntity } from '../../domain/entities/post.entity';

export class PostMapper {
  static toDomain(row: any): PostEntity {
    return new PostEntity({
      id: row.id,
      code: row.code,
      name: row.name,
      level: row.level ?? 1,
      sortOrder: row.sortOrder ?? 0,
      status: row.status as any,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(entity: PostEntity): any {
    return {
      code: entity.code,
      name: entity.name,
      level: entity.level,
      sortOrder: entity.sortOrder,
      status: entity.status,
      description: entity.description ?? null,
    };
  }
}
