import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core';
import { RoleEntity } from '../../domain/entities/role.entity';
import { RoleMapper } from '../mappers/role.mapper';
import {
  IRoleRepository,
  ListRoleByPageQuery,
} from '../../domain/repositories/role.repository.interface';
import { PaginatedResponse } from '@shared';

@Injectable()
export class RoleRepository implements IRoleRepository {
  constructor(private prisma: PrismaService) {}

  async getById(id: number): Promise<RoleEntity | null> {
    const row = await this.prisma.role.findUnique({ where: { id } });
    return row ? RoleMapper.toDomain(row) : null;
  }

  async getByCode(code: string): Promise<RoleEntity | null> {
    const row = await this.prisma.role.findUnique({ where: { code } });
    return row ? RoleMapper.toDomain(row) : null;
  }

  async list(params?: {
    type?: string;
    status?: string;
  }): Promise<RoleEntity[]> {
    const where: any = {};
    if (params?.type) where.type = params.type;
    if (params?.status) where.status = params.status;

    const rows = await this.prisma.role.findMany({ where });
    return rows.map(RoleMapper.toDomain);
  }

  async listByPage(
    query: ListRoleByPageQuery,
  ): Promise<PaginatedResponse<RoleEntity>> {
    const { current, pageSize, type, status, keyword } = query;

    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (keyword) {
      where.OR = [
        { code: { contains: keyword } },
        { name: { contains: keyword } },
      ];
    }

    const total = await this.prisma.role.count({ where });

    const rows = await this.prisma.role.findMany({
      where,
      take: pageSize,
      skip: (current - 1) * pageSize,
    });

    return new PaginatedResponse(
      rows.map(RoleMapper.toDomain),
      total,
      current,
      pageSize,
    );
  }

  async save(entity: RoleEntity): Promise<RoleEntity> {
    const data = RoleMapper.toPersistence(entity);
    await this.prisma.role.create({ data });

    const created = await this.getByCode(entity.code);
    if (!created) throw new Error('Failed to create role');
    return created;
  }

  async updateById(id: number, data: Partial<RoleEntity>): Promise<RoleEntity> {
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.code !== undefined) patch.code = data.code;
    if (data.description !== undefined) patch.description = data.description;
    if (data.type !== undefined) patch.type = data.type;
    if (data.level !== undefined) patch.level = data.level;
    if (data.status !== undefined) patch.status = data.status;

    if (Object.keys(patch).length > 0) {
      await this.prisma.role.update({ where: { id }, data: patch });
    }

    const updated = await this.getById(id);
    if (!updated) throw new Error('Failed to update role');
    return updated;
  }

  async removeById(id: number): Promise<void> {
    await this.prisma.role.delete({ where: { id } });
  }
}
