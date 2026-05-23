import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core';
import { OAuthEntity } from '../../domain/entities/oauth.entity';
import { OAuthMapper } from '../mappers/oauth.mapper';
import { IOAuthRepository } from '../../domain/repositories/oauth.repository.interface';

@Injectable()
export class OAuthRepository implements IOAuthRepository {
  constructor(private prisma: PrismaService) {}

  async getById(id: number): Promise<OAuthEntity | null> {
    const row = await this.prisma.userOAuth.findUnique({ where: { id } });
    return row ? OAuthMapper.toDomain(row) : null;
  }

  async findByProvider(
    provider: string,
    providerId: string,
  ): Promise<OAuthEntity | null> {
    const row = await this.prisma.userOAuth.findUnique({
      where: { provider_providerId: { provider, providerId } },
    });
    return row ? OAuthMapper.toDomain(row) : null;
  }

  async listByUserId(userId: number): Promise<OAuthEntity[]> {
    const rows = await this.prisma.userOAuth.findMany({
      where: { userId },
    });
    return rows.map(OAuthMapper.toDomain);
  }

  async save(entity: OAuthEntity): Promise<OAuthEntity> {
    const data = OAuthMapper.toPersistence(entity);
    const created = await this.prisma.userOAuth.create({ data });
    return OAuthMapper.toDomain(created);
  }

  async updateById(
    id: number,
    data: Partial<OAuthEntity>,
  ): Promise<OAuthEntity> {
    const patch: Record<string, unknown> = {};
    if (data.userId !== undefined) patch.userId = data.userId;
    if (data.provider !== undefined) patch.provider = data.provider;
    if (data.providerId !== undefined) patch.providerId = data.providerId;
    if (data.unionId !== undefined) patch.unionId = data.unionId;
    if (data.accessToken !== undefined) patch.accessToken = data.accessToken;
    if (data.refreshToken !== undefined) patch.refreshToken = data.refreshToken;
    if (data.expiresAt !== undefined) patch.expiresAt = data.expiresAt;

    if (Object.keys(patch).length > 0) {
      await this.prisma.userOAuth.update({ where: { id }, data: patch });
    }

    const updated = await this.getById(id);
    if (!updated) throw new Error('Failed to update oauth');
    return updated;
  }

  async removeById(id: number): Promise<void> {
    await this.prisma.userOAuth.delete({ where: { id } });
  }

  async removeByUserIdAndProvider(
    userId: number,
    provider: string,
  ): Promise<void> {
    await this.prisma.userOAuth.deleteMany({
      where: { userId, provider },
    });
  }
}
