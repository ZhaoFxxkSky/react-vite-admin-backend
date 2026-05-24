import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core';
import { PostEntity } from '../../domain/entities/post.entity';
import { PostMapper } from '../mappers/post.mapper';
import {
  IPostRepository,
  ListPostByPageQuery,
} from '../../domain/repositories/post.repository.interface';
import { PaginatedResponse } from '@shared';

@Injectable()
export class PostRepository implements IPostRepository {
  constructor(private prisma: PrismaService) {}

  async getById(id: number): Promise<PostEntity | null> {
    const row = await this.prisma.post.findUnique({ where: { id } });
    return row ? PostMapper.toDomain(row) : null;
  }

  async getByCode(code: string): Promise<PostEntity | null> {
    const row = await this.prisma.post.findUnique({ where: { code } });
    return row ? PostMapper.toDomain(row) : null;
  }

  async list(params?: { status?: string }): Promise<PostEntity[]> {
    const where: any = {};
    if (params?.status) where.status = params.status;

    const rows = await this.prisma.post.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map(PostMapper.toDomain);
  }

  async listByPage(
    query: ListPostByPageQuery,
  ): Promise<PaginatedResponse<PostEntity>> {
    const { current, pageSize, status, keyword } = query;

    const where: any = {};
    if (status) where.status = status;
    if (keyword) {
      where.OR = [
        { code: { contains: keyword } },
        { name: { contains: keyword } },
      ];
    }

    const total = await this.prisma.post.count({ where });

    const rows = await this.prisma.post.findMany({
      where,
      take: pageSize,
      skip: (current - 1) * pageSize,
      orderBy: { sortOrder: 'asc' },
    });

    return new PaginatedResponse(
      rows.map(PostMapper.toDomain),
      total,
      current,
      pageSize,
    );
  }

  async save(entity: PostEntity): Promise<PostEntity> {
    const data = PostMapper.toPersistence(entity);
    await this.prisma.post.create({ data });

    const created = await this.getByCode(entity.code);
    if (!created) throw new Error('Failed to create post');
    return created;
  }

  async updateById(id: number, data: Partial<PostEntity>): Promise<PostEntity> {
    const patch: Record<string, unknown> = {};
    if (data.code !== undefined) patch.code = data.code;
    if (data.name !== undefined) patch.name = data.name;
    if (data.level !== undefined) patch.level = data.level;
    if (data.sortOrder !== undefined) patch.sortOrder = data.sortOrder;
    if (data.status !== undefined) patch.status = data.status;
    if (data.description !== undefined) patch.description = data.description;

    if (Object.keys(patch).length > 0) {
      await this.prisma.post.update({ where: { id }, data: patch });
    }

    const updated = await this.getById(id);
    if (!updated) throw new Error('Failed to update post');
    return updated;
  }

  async removeById(id: number): Promise<void> {
    await this.prisma.post.delete({ where: { id } });
  }
}
