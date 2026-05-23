import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core';
import { DictDataEntity } from '../../domain/entities/dict-data.entity';
import { DictDataMapper } from '../mappers/dict-data.mapper';
import {
  IDictDataRepository,
  ListDictDataByPageQuery,
} from '../../domain/repositories/dict-data.repository.interface';
import { PaginatedResponse } from '@shared';

@Injectable()
export class DictDataRepository implements IDictDataRepository {
  constructor(private prisma: PrismaService) {}

  async getById(id: number): Promise<DictDataEntity | null> {
    const row = await this.prisma.dictData.findUnique({ where: { id } });
    return row ? DictDataMapper.toDomain(row) : null;
  }

  async list(params?: {
    dictId?: number;
    status?: string;
  }): Promise<DictDataEntity[]> {
    const where: any = {};
    if (params?.dictId !== undefined) where.dictId = params.dictId;
    if (params?.status) where.status = params.status;

    const rows = await this.prisma.dictData.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map(DictDataMapper.toDomain);
  }

  async listByPage(
    query: ListDictDataByPageQuery,
  ): Promise<PaginatedResponse<DictDataEntity>> {
    const { current, pageSize, dictId, status, keyword } = query;

    const where: any = {};
    if (dictId !== undefined && dictId !== null) where.dictId = dictId;
    if (status) where.status = status;
    if (keyword) {
      where.OR = [
        { label: { contains: keyword } },
        { value: { contains: keyword } },
      ];
    }

    const total = await this.prisma.dictData.count({ where });

    const rows = await this.prisma.dictData.findMany({
      where,
      take: pageSize,
      skip: (current - 1) * pageSize,
      orderBy: { sortOrder: 'asc' },
    });

    return new PaginatedResponse(
      rows.map(DictDataMapper.toDomain),
      total,
      current,
      pageSize,
    );
  }

  async save(entity: DictDataEntity): Promise<DictDataEntity> {
    const data = DictDataMapper.toPersistence(entity);
    await this.prisma.dictData.create({ data });

    const latest = await this.prisma.dictData.findFirst({
      where: {
        dictId: entity.dictId,
        label: entity.label,
        value: entity.value,
      },
      orderBy: { id: 'desc' },
    });
    if (!latest) throw new Error('Failed to create dict data');
    return DictDataMapper.toDomain(latest);
  }

  async updateById(
    id: number,
    data: Partial<DictDataEntity>,
  ): Promise<DictDataEntity> {
    const patch: Record<string, unknown> = {};
    if (data.dictId !== undefined) patch.dictId = data.dictId;
    if (data.label !== undefined) patch.label = data.label;
    if (data.value !== undefined) patch.value = data.value;
    if (data.sortOrder !== undefined) patch.sortOrder = data.sortOrder;
    if (data.status !== undefined) patch.status = data.status;
    if (data.remark !== undefined) patch.remark = data.remark;

    if (Object.keys(patch).length > 0) {
      await this.prisma.dictData.update({ where: { id }, data: patch });
    }

    const updated = await this.getById(id);
    if (!updated) throw new Error('Failed to update dict data');
    return updated;
  }

  async removeById(id: number): Promise<void> {
    await this.prisma.dictData.delete({ where: { id } });
  }
}
