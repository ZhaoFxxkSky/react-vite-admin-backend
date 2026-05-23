import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core';
import { PermissionEntity } from '../../domain/entities/permission.entity';
import { PermissionMapper } from '../mappers/permission.mapper';
import {
  IPermissionRepository,
  ListPermissionByPageQuery,
} from '../../domain/repositories/permission.repository.interface';
import { PaginatedResponse } from '@shared';

@Injectable()
export class PermissionRepository implements IPermissionRepository {
  constructor(private prisma: PrismaService) {}

  async getById(id: number): Promise<PermissionEntity | null> {
    const row = await this.prisma.permission.findUnique({ where: { id } });
    return row ? PermissionMapper.toDomain(row) : null;
  }

  async getByCode(code: string): Promise<PermissionEntity | null> {
    const row = await this.prisma.permission.findUnique({ where: { code } });
    return row ? PermissionMapper.toDomain(row) : null;
  }

  async list(): Promise<PermissionEntity[]> {
    const rows = await this.prisma.permission.findMany();
    return rows.map(PermissionMapper.toDomain);
  }

  async listMenu(): Promise<PermissionEntity[]> {
    const rows = await this.prisma.permission.findMany({
      where: {
        type: {
          not: 'button',
        },
      },
    });

    return rows.map(PermissionMapper.toDomain);
  }

  async listByPage(
    query: ListPermissionByPageQuery,
  ): Promise<PaginatedResponse<PermissionEntity>> {
    const { current, pageSize, type, keyword } = query;

    const where: any = {};
    if (type) where.type = type;
    if (keyword) {
      where.OR = [
        { code: { contains: keyword } },
        { name: { contains: keyword } },
      ];
    }

    const total = await this.prisma.permission.count({ where });

    const rows = await this.prisma.permission.findMany({
      where,
      take: pageSize,
      skip: (current - 1) * pageSize,
    });

    return new PaginatedResponse(
      rows.map(PermissionMapper.toDomain),
      total,
      current,
      pageSize,
    );
  }

  async save(entity: PermissionEntity): Promise<PermissionEntity> {
    const data = PermissionMapper.toPersistence(entity);
    await this.prisma.permission.create({ data });

    const created = await this.getByCode(entity.code);
    if (!created) throw new Error('Failed to create permission');
    return created;
  }

  async updateById(
    id: number,
    patch: Partial<PermissionEntity>,
  ): Promise<PermissionEntity | null> {
    const updates: Record<string, any> = {};
    const allowed = [
      'pid',
      'code',
      'type',
      'name',
      'path',
      'component',
      'redirect',
      'handle',
      'sortOrder',
      'isSensitive',
      'status',
      'isBuiltIn',
      'description',
    ] as const;
    for (const key of allowed) {
      if (key in patch && (patch as any)[key] !== undefined) {
        updates[key] = (patch as any)[key];
      }
    }

    if (Object.keys(updates).length === 0) return this.getById(id);

    await this.prisma.permission.update({ where: { id }, data: updates });
    return this.getById(id);
  }

  async removeById(id: number): Promise<void> {
    await this.prisma.permission.delete({ where: { id } });
  }
}
