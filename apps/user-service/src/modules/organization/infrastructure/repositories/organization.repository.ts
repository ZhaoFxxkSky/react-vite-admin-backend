import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core';
import { OrganizationEntity } from '../../domain/entities/organization.entity';
import { OrganizationMapper } from '../mappers/organization.mapper';
import { IOrganizationRepository } from '../../domain/repositories/organization.repository.interface';

@Injectable()
export class OrganizationRepository implements IOrganizationRepository {
  constructor(private prisma: PrismaService) {}

  async getById(id: number): Promise<OrganizationEntity | null> {
    const row = await this.prisma.organization.findUnique({ where: { id } });
    return row ? OrganizationMapper.toDomain(row) : null;
  }

  async getByCode(code: string): Promise<OrganizationEntity | null> {
    const row = await this.prisma.organization.findUnique({ where: { code } });
    return row ? OrganizationMapper.toDomain(row) : null;
  }

  async list(params?: {
    parentId?: number | null;
    status?: string;
  }): Promise<OrganizationEntity[]> {
    const where: any = {};
    if (params?.parentId === null) {
      where.parentId = null;
    } else if (params?.parentId !== undefined) {
      where.parentId = params.parentId;
    }
    if (params?.status) {
      where.status = params.status;
    }

    const rows = await this.prisma.organization.findMany({ where });
    return rows.map(OrganizationMapper.toDomain);
  }

  async listAll(): Promise<OrganizationEntity[]> {
    const rows = await this.prisma.organization.findMany();
    return rows.map(OrganizationMapper.toDomain);
  }

  async countChildren(parentId: number): Promise<number> {
    return this.prisma.organization.count({ where: { parentId } });
  }

  async save(entity: OrganizationEntity): Promise<OrganizationEntity> {
    const data = OrganizationMapper.toPersistence(entity);
    await this.prisma.organization.create({ data });

    const created = await this.getByCode(entity.code);
    if (!created) throw new Error('Failed to create organization');
    return created;
  }

  async updateById(
    id: number,
    data: Partial<OrganizationEntity>,
  ): Promise<OrganizationEntity> {
    const patch: Record<string, unknown> = {};
    if (data.parentId !== undefined) patch.parentId = data.parentId;
    if (data.code !== undefined) patch.code = data.code;
    if (data.name !== undefined) patch.name = data.name;
    if (data.type !== undefined) patch.type = data.type;
    if (data.leaderId !== undefined) patch.leaderId = data.leaderId;
    if (data.sortOrder !== undefined) patch.sortOrder = data.sortOrder;
    if (data.description !== undefined) patch.description = data.description;
    if (data.status !== undefined) patch.status = data.status;

    if (Object.keys(patch).length > 0) {
      await this.prisma.organization.update({ where: { id }, data: patch });
    }

    const updated = await this.getById(id);
    if (!updated) throw new Error('Failed to update organization');
    return updated;
  }

  async removeById(id: number): Promise<void> {
    await this.prisma.organization.delete({ where: { id } });
  }
}
