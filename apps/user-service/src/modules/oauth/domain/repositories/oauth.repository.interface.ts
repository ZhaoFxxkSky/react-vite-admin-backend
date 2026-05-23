import { OAuthEntity } from '../entities/oauth.entity';

export interface IOAuthRepository {
  getById(id: number): Promise<OAuthEntity | null>;
  findByProvider(
    provider: string,
    providerId: string,
  ): Promise<OAuthEntity | null>;
  listByUserId(userId: number): Promise<OAuthEntity[]>;
  save(entity: OAuthEntity): Promise<OAuthEntity>;
  updateById(
    id: number,
    data: Partial<OAuthEntity>,
  ): Promise<OAuthEntity>;
  removeById(id: number): Promise<void>;
  removeByUserIdAndProvider(userId: number, provider: string): Promise<void>;
}
