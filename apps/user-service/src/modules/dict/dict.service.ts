import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@core';
import { DictTypeEntity } from './domain/entities/dict-type.entity';
import { DictDataEntity } from './domain/entities/dict-data.entity';
import { DictTypeRepository } from './infrastructure/repositories/dict-type.repository';
import { DictDataRepository } from './infrastructure/repositories/dict-data.repository';
import {
  CreateDictTypeDto,
  UpdateDictTypeDto,
  CreateDictDataDto,
  UpdateDictDataDto,
} from './dto';

@Injectable()
export class DictService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dictTypeRepo: DictTypeRepository,
    private readonly dictDataRepo: DictDataRepository,
  ) {}

  // ===================== 字典类型 CRUD =====================

  async listTypes(params?: { status?: string }) {
    return this.dictTypeRepo.list(params);
  }

  async getTypeById(id: number) {
    const type = await this.dictTypeRepo.getById(id);
    if (!type) throw new NotFoundException(`Dict type ${id} not found`);
    return type;
  }

  async saveType(data: CreateDictTypeDto) {
    const existing = await this.dictTypeRepo.getByCode(data.code);
    if (existing) {
      throw new ConflictException(
        `Dict type code "${data.code}" already exists`,
      );
    }

    return this.dictTypeRepo.save(
      new DictTypeEntity({
        code: data.code,
        name: data.name,
        description: data.description ?? null,
        status: 'active',
      }),
    );
  }

  async updateTypeById(id: number, data: UpdateDictTypeDto) {
    const existing = await this.dictTypeRepo.getById(id);
    if (!existing) throw new NotFoundException(`Dict type ${id} not found`);

    if (data.code && data.code !== existing.code) {
      const conflict = await this.dictTypeRepo.getByCode(data.code);
      if (conflict && conflict.id !== id) {
        throw new ConflictException(
          `Dict type code "${data.code}" already exists`,
        );
      }
    }

    return this.dictTypeRepo.updateById(id, data as any);
  }

  async removeTypeById(id: number) {
    const existing = await this.dictTypeRepo.getById(id);
    if (!existing) throw new NotFoundException(`Dict type ${id} not found`);

    const dataCount = await this.prisma.dictData.count({
      where: { dictId: id },
    });

    if (dataCount > 0) {
      throw new BadRequestException(
        'Cannot delete dict type with existing data entries',
      );
    }

    await this.dictTypeRepo.removeById(id);
    return { id };
  }

  // ===================== 字典数据 CRUD =====================

  async listData(params?: { dictId?: number; status?: string }) {
    return this.dictDataRepo.list(params);
  }

  async getDataById(id: number) {
    const data = await this.dictDataRepo.getById(id);
    if (!data) throw new NotFoundException(`Dict data ${id} not found`);
    return data;
  }

  async saveData(data: CreateDictDataDto) {
    const type = await this.dictTypeRepo.getById(data.dictId);
    if (!type) {
      throw new NotFoundException(`Dict type ${data.dictId} not found`);
    }

    return this.dictDataRepo.save(
      new DictDataEntity({
        dictId: data.dictId,
        label: data.label,
        value: data.value,
        sortOrder: data.sortOrder ?? 0,
        status: 'active',
        remark: data.remark ?? null,
      }),
    );
  }

  async updateDataById(id: number, data: UpdateDictDataDto) {
    const existing = await this.dictDataRepo.getById(id);
    if (!existing) throw new NotFoundException(`Dict data ${id} not found`);

    if (data.dictId !== undefined && data.dictId !== existing.dictId) {
      const type = await this.dictTypeRepo.getById(data.dictId);
      if (!type) {
        throw new NotFoundException(`Dict type ${data.dictId} not found`);
      }
    }

    return this.dictDataRepo.updateById(id, data as any);
  }

  async removeDataById(id: number) {
    const existing = await this.dictDataRepo.getById(id);
    if (!existing) throw new NotFoundException(`Dict data ${id} not found`);

    await this.dictDataRepo.removeById(id);
    return { id };
  }

  // ===================== 字典查询 =====================

  async getDictByCode(code: string) {
    const type = await this.dictTypeRepo.getByCode(code);
    if (!type) throw new NotFoundException(`Dict type "${code}" not found`);

    const list = await this.dictDataRepo.list({
      dictId: type.id,
      status: 'active',
    });

    return {
      type,
      list,
    };
  }
}
