import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { AppLogger, LogMethod, PrismaService } from '@core';
import { hashPassword, comparePassword } from '@shared';
import { UserEntity } from './domain/entities/user.entity';
import { UserRepository } from './infrastructure/repositories/user.repository';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateUserByIdDto,
  ListUserByPageDto,
} from './dto';
import { OrganizationService } from '../organization/organization.service';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private readonly userRepository: UserRepository,
    private readonly orgService: OrganizationService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(UserService.name);
  }

  // ===================== 管理员接�?=====================

  @LogMethod()
  async listByPage(dto: ListUserByPageDto) {
    return this.userRepository.listByPage({
      current: dto.current,
      pageSize: dto.pageSize,
      keyword: dto.keyword ?? null,
      status: dto.status ?? null,
    });
  }

  @LogMethod()
  async getById(id: number) {
    const user = await this.userRepository.getById(id);
    if (!user) throw new NotFoundException('User not found');
    const { password: _password, ...rest } = user;
    return rest;
  }

  @LogMethod()
  async save(dto: CreateUserDto, currentUserIsSuperAdmin = false) {
    if (await this.userRepository.getByUsername(dto.username)) {
      throw new ConflictException('Username already exists');
    }
    if (dto.email && (await this.userRepository.getByEmail(dto.email))) {
      throw new ConflictException('Email already exists');
    }
    if (dto.phone && (await this.userRepository.getByPhone(dto.phone))) {
      throw new ConflictException('Phone already exists');
    }

    if (dto.organizationId != null) {
      const org = await this.prisma.organization.findUnique({
        where: { id: dto.organizationId },
      });
      if (!org) {
        throw new NotFoundException(
          `Organization ${dto.organizationId} not found`,
        );
      }
    }

    if (dto.isSuperAdmin && !currentUserIsSuperAdmin) {
      throw new ForbiddenException(
        'Only existing super admins can create another super admin',
      );
    }

    const hashedPassword = await hashPassword(dto.password);

    const user = await this.userRepository.save(
      new UserEntity({
        username: dto.username,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        password: hashedPassword,
        realName: dto.realName ?? null,
        nickName: dto.nickName ?? null,
        avatar: dto.avatar ?? null,
        gender: (dto.gender ?? 'unknown') as any,
        birthday: dto.birthday ?? null,
        employeeNo: dto.employeeNo ?? null,
        jobTitle: dto.jobTitle ?? null,
        isSuperAdmin: dto.isSuperAdmin ?? false,
        status: (dto.status ?? 'active') as any,
        loginFailCount: 0,
      }),
    );

    if (dto.organizationId != null) {
      await this.prisma.userOrganization.create({
        data: {
          userId: user.id,
          organizationId: dto.organizationId,
          isPrimary: true,
        },
      });
    }

    if (dto.extraOrgIds?.length) {
      await this.orgService.setExtraOrgsForUser(user.id, dto.extraOrgIds);
    }

    if (dto.roleIds?.length) {
      await this.setRolesByUserId(user.id, dto.roleIds);
    }

    this.logger.info(`User created: id=${user.id}, username=${user.username}`);
    const { password: _p, ...rest } = user;
    return rest;
  }

  @LogMethod()
  async updateById(
    id: number,
    body: UpdateUserByIdDto,
    currentUserIsSuperAdmin = false,
  ) {
    const { extraOrgIds, organizationId, ...patch } = body;

    const existing = await this.userRepository.getById(id);
    if (!existing) throw new NotFoundException('User not found');

    if (patch.email && patch.email !== existing.email) {
      const dup = await this.userRepository.getByEmail(patch.email);
      if (dup && dup.id !== id) {
        throw new ConflictException('Email already exists');
      }
    }
    if (patch.phone && patch.phone !== existing.phone) {
      const dup = await this.userRepository.getByPhone(patch.phone);
      if (dup && dup.id !== id) {
        throw new ConflictException('Phone already exists');
      }
    }

    if (organizationId != null) {
      const org = await this.prisma.organization.findUnique({
        where: { id: organizationId },
      });
      if (!org) {
        throw new NotFoundException(`Organization ${organizationId} not found`);
      }
    }

    if (
      patch.isSuperAdmin !== undefined &&
      patch.isSuperAdmin !== existing.isSuperAdmin &&
      !currentUserIsSuperAdmin
    ) {
      throw new ForbiddenException('Only super admins can change isSuperAdmin');
    }

    const updated = await this.userRepository.updateById(id, patch as any);

    if (organizationId !== undefined) {
      await this.prisma.userOrganization.deleteMany({
        where: { userId: id, isPrimary: true },
      });
      if (organizationId != null) {
        await this.prisma.userOrganization.create({
          data: {
            userId: id,
            organizationId,
            isPrimary: true,
          },
        });
      }
    }

    if (extraOrgIds !== undefined && extraOrgIds !== null) {
      await this.orgService.setExtraOrgsForUser(id, extraOrgIds);
    }

    const { password: _p, ...rest } = updated;
    return rest;
  }

  @LogMethod()
  async removeById(id: number) {
    const existing = await this.userRepository.getById(id);
    if (!existing) throw new NotFoundException('User not found');
    if (existing.isSuperAdmin) {
      throw new BadRequestException('Cannot delete a super admin');
    }

    await this.prisma.$transaction(async (tx: any) => {
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.userOrganization.deleteMany({ where: { userId: id } });
      await tx.user.delete({ where: { id } });
    });
    return { id };
  }

  @LogMethod()
  async resetPasswordById(id: number, newPassword: string) {
    const existing = await this.userRepository.getById(id);
    if (!existing) throw new NotFoundException('User not found');

    const hashed = await hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id },
      data: {
        password: hashed,
        passwordChangedAt: new Date(),
        loginFailCount: 0,
      },
    });
    return { id };
  }

  @LogMethod()
  async changeStatusById(
    id: number,
    status: 'active' | 'inactive' | 'banned' | 'locked',
  ) {
    const existing = await this.userRepository.getById(id);
    if (!existing) throw new NotFoundException('User not found');
    await this.prisma.user.update({ where: { id }, data: { status } });
    return { id, status };
  }

  @LogMethod()
  async unlockById(id: number) {
    const existing = await this.userRepository.getById(id);
    if (!existing) throw new NotFoundException('User not found');
    await this.prisma.user.update({
      where: { id },
      data: { status: 'active', loginFailCount: 0 },
    });
    return { id };
  }

  // ===================== 用户 �?角色 =====================

  @LogMethod()
  async setRolesByUserId(userId: number, roleIds: number[]) {
    const existing = await this.userRepository.getById(userId);
    if (!existing) throw new NotFoundException('User not found');

    return this.prisma.$transaction(async (tx: any) => {
      await tx.userRole.deleteMany({ where: { userId } });

      if (roleIds.length > 0) {
        const dedup = Array.from(new Set(roleIds));
        const validRoles = await tx.role.findMany({
          where: { id: { in: dedup } },
          select: { id: true },
        });
        const validIds = new Set(validRoles.map((r: any) => r.id));
        const insertable = dedup.filter((id) => validIds.has(id));

        if (insertable.length > 0) {
          await tx.userRole.createMany({
            data: insertable.map((roleId) => ({ userId, roleId })),
          });
        }
      }
      return { userId, roleIds };
    });
  }

  @LogMethod()
  async listRolesByUserId(userId: number) {
    const rows = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true,
            status: true,
          },
        },
      },
    });
    return rows.map((r) => r.role);
  }

  // ===================== 个人中心 =====================

  @LogMethod()
  async getMe(userId: number) {
    const user = await this.userRepository.getById(userId);
    if (!user) throw new NotFoundException('User not found');

    const primaryOrgRow = await this.prisma.userOrganization.findFirst({
      where: { userId, isPrimary: true },
      include: {
        organization: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
      },
    });
    const primaryOrg = primaryOrgRow?.organization ?? null;

    const extraOrgs = await this.prisma.userOrganization.findMany({
      where: { userId, isPrimary: false },
      include: {
        organization: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
      },
    });

    const userRoleRows = await this.listRolesByUserId(userId);

    const { password: _p, ...rest } = user;
    return {
      ...rest,
      primaryOrganization: primaryOrg,
      extraOrganizations: extraOrgs.map((e) => e.organization),
      roles: userRoleRows,
    };
  }

  @LogMethod()
  async updateMe(userId: number, dto: UpdateUserDto) {
    const existing = await this.userRepository.getById(userId);
    if (!existing) throw new NotFoundException('User not found');

    if (dto.email && dto.email !== existing.email) {
      const dup = await this.userRepository.getByEmail(dto.email);
      if (dup && dup.id !== userId) {
        throw new ConflictException('Email already exists');
      }
    }
    if (dto.phone && dto.phone !== existing.phone) {
      const dup = await this.userRepository.getByPhone(dto.phone);
      if (dup && dup.id !== userId) {
        throw new ConflictException('Phone already exists');
      }
    }

    const updated = await this.userRepository.updateById(userId, dto as any);
    const { password: _p, ...rest } = updated;
    return rest;
  }

  @LogMethod()
  async changePassword(
    userId: number,
    oldPassword: string,
    newPassword: string,
  ) {
    const user = await this.userRepository.getById(userId);
    if (!user) throw new NotFoundException('User not found');

    const valid = await comparePassword(oldPassword, user.password);
    if (!valid) {
      throw new ForbiddenException('Old password is incorrect');
    }

    const hashed = await hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed, passwordChangedAt: new Date() },
    });

    return { message: 'Password changed successfully' };
  }

  // ===================== Excel 导入导出 =====================

  async exportUsers(query: any) {
    const users = await this.prisma.user.findMany({
      where: query.status ? { status: query.status } : {},
      select: {
        id: true,
        username: true,
        realName: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
      },
    });

    return users.map((user) => ({
      id: user.id,
      username: user.username,
      realName: user.realName,
      email: user.email,
      phone: user.phone,
      status: user.status,
      createdAt: user.createdAt,
    }));
  }

  async importUsers(data: any[]) {
    const results = {
      success: 0,
      fail: 0,
      errors: [] as string[],
    };

    for (const row of data) {
      try {
        await this.save(
          {
            username: row.username,
            realName: row.realName,
            email: row.email,
            phone: row.phone,
            password: row.password || '123456',
          } as CreateUserDto,
          true,
        );
        results.success++;
      } catch (error: any) {
        results.fail++;
        results.errors.push(`${row.username}: ${error.message}`);
      }
    }

    return results;
  }

  async generateImportTemplate() {
    return [
      {
        username: 'zhangsan',
        realName: '张三',
        email: 'zhangsan@example.com',
        phone: '13800138001',
      },
      {
        username: 'lisi',
        realName: '李四',
        email: 'lisi@example.com',
        phone: '13800138002',
      },
    ];
  }

  // ===================== 批量操作 =====================

  @LogMethod()
  async batchChangeStatus(ids: number[], status: string) {
    const result = await this.prisma.user.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });

    this.logger.info(
      `Batch change status: count=${result.count}, status=${status}`,
    );
    return { count: result.count };
  }

  @LogMethod()
  async batchResetPassword(ids: number[], newPassword: string) {
    const hashed = await hashPassword(newPassword);
    const result = await this.prisma.user.updateMany({
      where: { id: { in: ids } },
      data: {
        password: hashed,
        passwordChangedAt: new Date(),
        loginFailCount: 0,
      },
    });

    this.logger.info(`Batch reset password: count=${result.count}`);
    return { count: result.count };
  }

  @LogMethod()
  async batchSetRoles(ids: number[], roleIds: number[]) {
    for (const userId of ids) {
      await this.setRolesByUserId(userId, roleIds);
    }

    this.logger.info(
      `Batch set roles: userCount=${ids.length}, roleIds=${roleIds.join(',')}`,
    );
    return { userCount: ids.length, roleIds };
  }
}
