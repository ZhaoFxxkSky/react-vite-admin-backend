import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core';
import { ConfigEntity } from '../../domain/entities/config.entity';
import { ConfigMapper } from '../mappers/config.mapper';
import { IConfigRepository } from '../../domain/repositories/config.repository.interface';

@Injectable()
export class ConfigRepository implements IConfigRepository {
  constructor(private prisma: PrismaService) {}

  async getById(id: number): Promise<ConfigEntity | null> {
    const row = await this.prisma.sysConfig.findUnique({ where: { id } });
    return row ? ConfigMapper.toDomain(row) : null;
  }

  async getByKey(key: string): Promise<ConfigEntity | null> {
    const row = await this.prisma.sysConfig.findUnique({ where: { key } });
    return row ? ConfigMapper.toDomain(row) : null;
  }

  async list(params?: {
    group?: string;
    status?: string;
  }): Promise<ConfigEntity[]> {
    const where: any = {};
    if (params?.group) {
      where.group = params.group;
    }
    if (params?.status) {
      where.status = params.status;
    }

    const rows = await this.prisma.sysConfig.findMany({ where });
    return rows.map(ConfigMapper.toDomain);
  }

  async listAll(): Promise<ConfigEntity[]> {
    const rows = await this.prisma.sysConfig.findMany();
    return rows.map(ConfigMapper.toDomain);
  }

  async save(entity: ConfigEntity): Promise<ConfigEntity> {
    const data = ConfigMapper.toPersistence(entity);
    await this.prisma.sysConfig.create({ data });

    const created = await this.getByKey(entity.key);
    if (!created) throw new Error('Failed to create config');
    return created;
  }

  async updateById(
    id: number,
    data: Partial<ConfigEntity>,
  ): Promise<ConfigEntity> {
    const patch: Record<string, unknown> = {};
    if (data.key !== undefined) patch.key = data.key;
    if (data.value !== undefined) patch.value = data.value;
    if (data.type !== undefined) patch.type = data.type;
    if (data.group !== undefined) patch.group = data.group;
    if (data.name !== undefined) patch.name = data.name;
    if (data.description !== undefined) patch.description = data.description;
    if (data.isBuiltIn !== undefined) patch.isBuiltIn = data.isBuiltIn;
    if (data.status !== undefined) patch.status = data.status;

    if (Object.keys(patch).length > 0) {
      await this.prisma.sysConfig.update({ where: { id }, data: patch });
    }

    const updated = await this.getById(id);
    if (!updated) throw new Error('Failed to update config');
    return updated;
  }

  async removeById(id: number): Promise<void> {
    await this.prisma.sysConfig.delete({ where: { id } });
  }
}
