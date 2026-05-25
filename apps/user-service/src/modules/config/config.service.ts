import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { RedisService } from '@core';
import { ConfigEntity } from './domain/entities/config.entity';
import { ConfigRepository } from './infrastructure/repositories/config.repository';
import { CreateConfigDto, UpdateConfigDto } from './dto';

const CONFIG_CACHE_PREFIX = 'sys:config:';
const CONFIG_CACHE_TTL = 3600; // 1 hour

@Injectable()
export class ConfigService {
  constructor(
    private readonly configRepo: ConfigRepository,
    private readonly redisService: RedisService,
  ) {}

  // ===================== 配置 CRUD =====================

  async listAll() {
    const all = await this.configRepo.listAll();
    return all.map((c) => this.toPlain(c));
  }

  async listByGroup(group: string) {
    const list = await this.configRepo.list({ group });
    return list.map((c) => this.toPlain(c));
  }

  async getById(id: number) {
    const config = await this.configRepo.getById(id);
    if (!config) throw new NotFoundException(`Config ${id} not found`);
    return this.toPlain(config);
  }

  async getValue(
    key: string,
    defaultValue?: string,
  ): Promise<string | undefined> {
    // 1. 尝试从缓存获取
    const cacheKey = `${CONFIG_CACHE_PREFIX}${key}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // 2. 从数据库获取
    const config = await this.configRepo.getByKey(key);
    if (!config || !config.isActive()) {
      return defaultValue;
    }

    // 3. 写入缓存
    await this.redisService.set(cacheKey, config.value, CONFIG_CACHE_TTL);
    return config.value;
  }

  async setValue(key: string, value: string): Promise<ConfigEntity> {
    const config = await this.configRepo.getByKey(key);
    if (!config) {
      throw new NotFoundException(`Config key "${key}" not found`);
    }

    if (config.isBuiltIn) {
      throw new BadRequestException('Cannot modify built-in config');
    }

    const updated = await this.configRepo.updateById(config.id, { value });

    // 更新缓存
    const cacheKey = `${CONFIG_CACHE_PREFIX}${key}`;
    await this.redisService.set(cacheKey, value, CONFIG_CACHE_TTL);

    return updated;
  }

  async save(data: CreateConfigDto) {
    const existing = await this.configRepo.getByKey(data.key);
    if (existing) {
      throw new ConflictException(`Config key "${data.key}" already exists`);
    }

    const created = await this.configRepo.save(
      new ConfigEntity({
        key: data.key,
        value: data.value,
        type: (data.type ?? 'string') as any,
        group: data.group ?? 'system',
        name: data.name,
        description: data.description ?? null,
        isBuiltIn: false,
        status: 'active',
      }),
    );

    // 写入缓存
    const cacheKey = `${CONFIG_CACHE_PREFIX}${created.key}`;
    await this.redisService.set(cacheKey, created.value, CONFIG_CACHE_TTL);

    return this.toPlain(created);
  }

  async updateById(id: number, data: UpdateConfigDto) {
    const existing = await this.configRepo.getById(id);
    if (!existing) throw new NotFoundException(`Config ${id} not found`);

    if (data.key && data.key !== existing.key) {
      const conflict = await this.configRepo.getByKey(data.key);
      if (conflict && conflict.id !== id) {
        throw new ConflictException(`Config key "${data.key}" already exists`);
      }
    }

    if (existing.isBuiltIn && data.value === undefined) {
      throw new BadRequestException('Built-in config can only update value');
    }

    const updated = await this.configRepo.updateById(id, data as any);

    // 更新缓存
    const cacheKey = `${CONFIG_CACHE_PREFIX}${updated.key}`;
    await this.redisService.set(cacheKey, updated.value, CONFIG_CACHE_TTL);

    return this.toPlain(updated);
  }

  async removeById(id: number) {
    const existing = await this.configRepo.getById(id);
    if (!existing) throw new NotFoundException(`Config ${id} not found`);

    if (existing.isBuiltIn) {
      throw new BadRequestException('Cannot delete built-in config');
    }

    await this.configRepo.removeById(id);

    // 删除缓存
    const cacheKey = `${CONFIG_CACHE_PREFIX}${existing.key}`;
    await this.redisService.del(cacheKey);

    return { id };
  }

  // ===================== 缓存管理 =====================

  async refreshCache() {
    const all = await this.configRepo.list({ status: 'active' });
    const redis = this.redisService.getClient();
    const pipeline = redis.pipeline();

    for (const config of all) {
      const cacheKey = `${CONFIG_CACHE_PREFIX}${config.key}`;
      pipeline.setex(cacheKey, CONFIG_CACHE_TTL, config.value);
    }

    await pipeline.exec();
    return { count: all.length };
  }

  // ===================== 内部辅助 =====================

  private toPlain(entity: ConfigEntity) {
    return {
      id: entity.id,
      key: entity.key,
      value: entity.value,
      type: entity.type,
      group: entity.group,
      name: entity.name,
      description: entity.description,
      isBuiltIn: entity.isBuiltIn,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
