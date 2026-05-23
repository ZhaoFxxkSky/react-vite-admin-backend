import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core';
import { DictTypeEntity } from '../../domain/entities/dict-type.entity';
import { DictTypeMapper } from '../mappers/dict-type.mapper';
import {
  IDictTypeRepository,
  ListDictTypeByPageQuery,
} from '../../domain/repositories/dict-type.repository.interface';
import { PaginatedResponse } from '@shared';

@Injectable()
export class DictTypeRepository implements IDictTypeRepository {
  constructor(private prisma: PrismaService) {}

  async getById(id: number): Promise<DictTypeEntity | null> {
    const row = await this.prisma.dictType.findUnique({ where: { id } });
    return row ? DictTypeMapper.toDomain(row) : null;
  }

  async getByCode(code: string): Promise<DictTypeEntity | null> {
    const row = await this.prisma.dictType.findUnique({ where: { code } });
    return row ? DictTypeMapper.toDomain(row) : null;
  }

  async list(params?: { status?: string }): Promise<DictTypeEntity[]> {
    const where: any = {};
    if (params?.status) where.status = params.status;

    const rows = await this.prisma.dictType.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(DictTypeMapper.toDomain);
  }

  async listByPage(
    query: ListDictTypeByPageQuery,
  ): Promise<PaginatedResponse<DictTypeEntity>> {
    const { current, pageSize, status, keyword } = query;

    const where: any = {};
    if (status) where.status = status;
    if (keyword) {
      where.OR = [
        { code: { contains: keyword } },
        { name: { contains: keyword } },
      ];
    }

    const total = await this.prisma.dictType.count({ where });

    const rows = await this.prisma.dictType.findMany({
      where,
      take: pageSize,
      skip: (current - 1) * pageSize,
      orderBy: { createdAt: 'desc' },
    });

    return new PaginatedResponse(
      rows.map(DictTypeMapper.toDomain),
      total,
      current,
      pageSize,
    );
  }

  async save(entity: DictTypeEntity): Promise<DictTypeEntity> {
    const data = DictTypeMapper.toPersistence(entity);
    await this.prisma.dictType.create({ data });

    const created = await this.getByCode(entity.code);
    if (!created) throw new Error('Failed to create dict type');
    return created;
  }

  async updateById(
    id: number,
    data: Partial<DictTypeEntity>,
  ): Promise<DictTypeEntity> {
    const patch: Record<string, unknown> = {};
    if (data.code !== undefined) patch.code = data.code;
    if (data.name !== undefined) patch.name = data.name;
    if (data.description !== undefined) patch.description = data.description;
    if (data.status !== undefined) patch.status = data.status;

    if (Object.keys(patch).length > 0) {
      await this.prisma.dictType.update({ where: { id }, data: patch });
    }

    const updated = await this.getById(id);
    if (!updated) throw new Error('Failed to update dict type');
    return updated;
  }

  async removeById(id: number): Promise<void> {
    await this.prisma.dictType.delete({ where: { id } });
  }
}
