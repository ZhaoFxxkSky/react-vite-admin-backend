import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core';
import { UserEntity } from '../../domain/entities/user.entity';
import { UserMapper } from '../mappers/user.mapper';
import {
  IUserRepository,
  ListUserByPageQuery,
} from '../../domain/repositories/user.repository.interface';
import { PaginatedResponse } from '@shared';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private prisma: PrismaService) {}

  async getById(id: number): Promise<UserEntity | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? UserMapper.toDomain(row) : null;
  }

  async getByUsername(username: string): Promise<UserEntity | null> {
    const row = await this.prisma.user.findUnique({ where: { username } });
    return row ? UserMapper.toDomain(row) : null;
  }

  async getByEmail(email: string): Promise<UserEntity | null> {
    const row = await this.prisma.user.findUnique({ where: { email } });
    return row ? UserMapper.toDomain(row) : null;
  }

  async getByPhone(phone: string): Promise<UserEntity | null> {
    const row = await this.prisma.user.findUnique({ where: { phone } });
    return row ? UserMapper.toDomain(row) : null;
  }

  async getByAccount(account: string): Promise<UserEntity | null> {
    const row = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: account }, { email: account }, { phone: account }],
      },
    });
    return row ? UserMapper.toDomain(row) : null;
  }

  async listByPage(
    query: ListUserByPageQuery,
  ): Promise<PaginatedResponse<UserEntity>> {
    const { current, pageSize, keyword, status } = query;

    const where: any = {};
    if (keyword) {
      where.OR = [
        { username: { contains: keyword } },
        { realName: { contains: keyword } },
        { nickName: { contains: keyword } },
        { email: { contains: keyword } },
        { phone: { contains: keyword } },
      ];
    }
    if (status) where.status = status;

    const total = await this.prisma.user.count({ where });

    const rows = await this.prisma.user.findMany({
      where,
      take: pageSize,
      skip: (current - 1) * pageSize,
    });

    return new PaginatedResponse(
      rows.map(UserMapper.toDomain),
      total,
      current,
      pageSize,
    );
  }

  async save(entity: UserEntity): Promise<UserEntity> {
    const data = UserMapper.toPersistence(entity);
    await this.prisma.user.create({ data });

    const created = await this.getByUsername(entity.username);
    if (!created) throw new Error('Failed to create user');
    return created;
  }

  async updateById(
    id: number,
    data: Partial<UserEntity>,
  ): Promise<UserEntity> {
    const updateData: Record<string, unknown> = {};
    if (data.username !== undefined) updateData.username = data.username;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.password !== undefined) updateData.password = data.password;
    if (data.realName !== undefined) updateData.realName = data.realName;
    if (data.nickName !== undefined) updateData.nickName = data.nickName;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.birthday !== undefined) {
      updateData.birthday = data.birthday ?? null;
    }
    if (data.employeeNo !== undefined) updateData.employeeNo = data.employeeNo;
    if (data.jobTitle !== undefined) updateData.jobTitle = data.jobTitle;
    if (data.isSuperAdmin !== undefined)
      updateData.isSuperAdmin = data.isSuperAdmin;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.loginFailCount !== undefined)
      updateData.loginFailCount = data.loginFailCount;
    if (data.lastLoginAt !== undefined) updateData.lastLoginAt = data.lastLoginAt;
    if (data.lastLoginIp !== undefined) updateData.lastLoginIp = data.lastLoginIp;
    if (data.passwordChangedAt !== undefined)
      updateData.passwordChangedAt = data.passwordChangedAt;

    if (Object.keys(updateData).length > 0) {
      await this.prisma.user.update({ where: { id }, data: updateData });
    }

    const updated = await this.getById(id);
    if (!updated) throw new Error('Failed to update user');
    return updated;
  }

  async removeById(id: number): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
