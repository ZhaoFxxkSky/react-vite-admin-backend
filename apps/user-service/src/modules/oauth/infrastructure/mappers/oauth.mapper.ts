import { OAuthEntity } from '../../domain/entities/oauth.entity';

export class OAuthMapper {
  static toDomain(row: any): OAuthEntity {
    return new OAuthEntity({
      id: row.id,
      userId: row.userId,
      provider: row.provider,
      providerId: row.providerId,
      unionId: row.unionId,
      accessToken: row.accessToken,
      refreshToken: row.refreshToken,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(entity: OAuthEntity): any {
    return {
      userId: entity.userId,
      provider: entity.provider,
      providerId: entity.providerId,
      unionId: entity.unionId ?? null,
      accessToken: entity.accessToken ?? null,
      refreshToken: entity.refreshToken ?? null,
      expiresAt: entity.expiresAt ?? null,
    };
  }
}
