import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { OAuthEntity } from './domain/entities/oauth.entity';
import { OAuthRepository } from './infrastructure/repositories/oauth.repository';
import { BindOAuthDto } from './dto';

@Injectable()
export class OAuthService {
  constructor(private readonly oauthRepo: OAuthRepository) {}

  // ===================== OAuth CRUD =====================

  async findByProvider(provider: string, providerId: string) {
    const oauth = await this.oauthRepo.findByProvider(provider, providerId);
    if (!oauth) return null;
    return this.toPlain(oauth);
  }

  async listByUserId(userId: number) {
    const list = await this.oauthRepo.listByUserId(userId);
    return list.map((o) => this.toPlain(o));
  }

  async bindUser(userId: number, data: BindOAuthDto) {
    // 检查是否已绑定同 provider
    const existing = await this.oauthRepo.listByUserId(userId);
    const sameProvider = existing.find((o) => o.provider === data.provider);
    if (sameProvider) {
      throw new ConflictException(
        `User already bound to provider "${data.provider}"`,
      );
    }

    // 检查 providerId 是否已被其他用户绑定
    const conflict = await this.oauthRepo.findByProvider(
      data.provider,
      data.providerId,
    );
    if (conflict) {
      throw new ConflictException(
        `Provider "${data.provider}" account already bound to another user`,
      );
    }

    const created = await this.oauthRepo.save(
      new OAuthEntity({
        userId,
        provider: data.provider,
        providerId: data.providerId,
        unionId: data.unionId ?? null,
        accessToken: data.accessToken ?? null,
        refreshToken: data.refreshToken ?? null,
        expiresAt: data.expiresAt ?? null,
      }),
    );

    return this.toPlain(created);
  }

  async unbindUser(userId: number, provider: string) {
    const list = await this.oauthRepo.listByUserId(userId);
    const target = list.find((o) => o.provider === provider);
    if (!target) {
      throw new NotFoundException(
        `OAuth binding for provider "${provider}" not found`,
      );
    }

    await this.oauthRepo.removeByUserIdAndProvider(userId, provider);
    return { userId, provider };
  }

  // ===================== 内部辅助 =====================

  private toPlain(entity: OAuthEntity) {
    return {
      id: entity.id,
      userId: entity.userId,
      provider: entity.provider,
      providerId: entity.providerId,
      unionId: entity.unionId,
      accessToken: entity.accessToken,
      refreshToken: entity.refreshToken,
      expiresAt: entity.expiresAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
