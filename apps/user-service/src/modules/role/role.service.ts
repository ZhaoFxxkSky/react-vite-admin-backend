import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@core';
import { RoleEntity } from './domain/entities/role.entity';
import { RoleRepository } from './infrastructure/repositories/role.repository';
import { CreateRoleDto, ListRoleByPageDto, UpdateRoleDto } from './dto';

@Injectable()
export class RoleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roleRepo: RoleRepository,
  ) {}

  // ===================== 角色查询 =====================

  async list(params?: { type?: string; status?: string }) {
    return this.roleRepo.list(params);
  }

  async listByPage(query: ListRoleByPageDto) {
    return this.roleRepo.listByPage({
      current: query.current,
      pageSize: query.pageSize,
      type: query.type ?? null,
      status: query.status ?? null,
      keyword: query.keyword ?? null,
    });
  }

  async getById(id: number) {
    const role = await this.roleRepo.getById(id);
    if (!role) return null;

    const rows = await this.prisma.rolePermission.findMany({
      where: { roleId: id },
      select: { permissionId: true },
    });

    return {
      ...role,
      permissionIds: rows.map((r) => r.permissionId),
    };
  }

  async listIdsByUserId(userId: number): Promise<number[]> {
    const rows = await this.prisma.userRole.findMany({
      where: { userId },
      select: { roleId: true },
    });
    return rows.map((r) => r.roleId);
  }

  // ===================== 角色管理 =====================

  async save(data: CreateRoleDto) {
    const existing = await this.roleRepo.getByCode(data.code);
    if (existing) {
      throw new ConflictException(`Role code "${data.code}" already exists`);
    }

    const role = await this.roleRepo.save(
      new RoleEntity({
        name: data.name,
        code: data.code,
        description: data.description ?? null,
        type: (data.type ?? 'custom') as any,
        level: data.level ?? 1,
        status: 'active',
      }),
    );

    if (data.permissionIds?.length) {
      await this.prisma.rolePermission.createMany({
        data: data.permissionIds.map((pid) => ({
          roleId: role.id,
          permissionId: pid,
        })),
      });
    }

    return this.getById(role.id);
  }

  async updateById(id: number, data: UpdateRoleDto) {
    const { permissionIds, ...patch } = data;

    const role = await this.roleRepo.getById(id);
    if (!role) throw new NotFoundException('Role not found');

    await this.roleRepo.updateById(id, patch as any);

    if (permissionIds !== undefined && permissionIds !== null) {
      await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
      if (permissionIds.length > 0) {
        await this.prisma.rolePermission.createMany({
          data: permissionIds.map((pid: number) => ({
            roleId: id,
            permissionId: pid,
          })),
        });
      }
    }

    return this.getById(id);
  }

  async removeById(id: number) {
    const role = await this.roleRepo.getById(id);
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem()) {
      throw new BadRequestException('System role cannot be deleted');
    }

    await this.prisma.$transaction(async (tx: any) => {
      await tx.userRole.deleteMany({ where: { roleId: id } });
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      await tx.role.delete({ where: { id } });
    });
    return { id };
  }

  // ===================== 角色 �?权限 =====================

  async listPermissionsByRoleId(roleId: number) {
    const rows = await this.prisma.permission.findMany({
      where: {
        rolePermissions: {
          some: {
            roleId,
          },
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        path: true,
      },
    });

    return rows;
  }

  async setPermissionsByRoleId(roleId: number, permissionIds: number[]) {
    const role = await this.roleRepo.getById(roleId);
    if (!role) throw new NotFoundException('Role not found');

    return this.prisma.$transaction(async (tx: any) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });

      if (permissionIds.length > 0) {
        const dedup = Array.from(new Set(permissionIds));
        const valid = await tx.permission.findMany({
          where: { id: { in: dedup } },
          select: { id: true },
        });
        const validIds = new Set(valid.map((p: any) => p.id));
        const insertable = dedup.filter((id) => validIds.has(id));

        if (insertable.length > 0) {
          await tx.rolePermission.createMany({
            data: insertable.map((permissionId) => ({
              roleId,
              permissionId,
            })),
          });
        }
      }

      return { roleId, permissionIds };
    });
  }

  // ===================== 角色 �?接口权限 =====================

  async listApiPermissionsByRoleId(roleId: number) {
    const rows = await this.prisma.apiPermission.findMany({
      where: {
        roleApiPermissions: {
          some: {
            roleId,
          },
        },
      },
      select: { id: true, code: true, name: true },
    });

    return rows;
  }

  async setApiPermissionsByRoleId(roleId: number, apiPermissionIds: number[]) {
    const role = await this.roleRepo.getById(roleId);
    if (!role) throw new NotFoundException('Role not found');

    await this.prisma.$transaction(async (tx: any) => {
      await tx.roleApiPermission.deleteMany({ where: { roleId } });

      if (apiPermissionIds.length > 0) {
        const dedup = Array.from(new Set(apiPermissionIds));
        const valid = await tx.apiPermission.findMany({
          where: { id: { in: dedup } },
          select: { id: true },
        });
        const validIds = new Set(valid.map((p: any) => p.id));
        const insertable = dedup.filter((id) => validIds.has(id));

        if (insertable.length > 0) {
          await tx.roleApiPermission.createMany({
            data: insertable.map((apiPermissionId) => ({
              roleId,
              apiPermissionId,
            })),
          });
        }
      }
    });
  }

  // ===================== 角色 �?用户 =====================

  async listUsersByRoleId(roleId: number) {
    const rows = await this.prisma.userRole.findMany({
      where: { roleId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            realName: true,
            nickName: true,
            avatar: true,
            email: true,
            phone: true,
            status: true,
          },
        },
      },
    });

    return rows.map((r) => r.user);
  }

  async assignToUsers(roleId: number, userIds: number[]) {
    const role = await this.roleRepo.getById(roleId);
    if (!role) throw new NotFoundException('Role not found');
    if (userIds.length === 0) return { roleId, added: 0 };

    const dedup = Array.from(new Set(userIds));

    const validUsers = await this.prisma.user.findMany({
      where: { id: { in: dedup } },
      select: { id: true },
    });
    const validUserIds = new Set(validUsers.map((u) => u.id));

    const existing = await this.prisma.userRole.findMany({
      where: { roleId },
      select: { userId: true },
    });
    const existingSet = new Set(existing.map((e) => e.userId));

    const toAdd = dedup.filter(
      (uid) => validUserIds.has(uid) && !existingSet.has(uid),
    );

    if (toAdd.length > 0) {
      await this.prisma.userRole.createMany({
        data: toAdd.map((userId) => ({ userId, roleId })),
      });
    }

    return { roleId, added: toAdd.length };
  }

  async revokeFromUsers(roleId: number, userIds: number[]) {
    const role = await this.roleRepo.getById(roleId);
    if (!role) throw new NotFoundException('Role not found');
    if (userIds.length === 0) return { roleId, removed: 0 };

    const dedup = Array.from(new Set(userIds));
    await this.prisma.userRole.deleteMany({
      where: { roleId, userId: { in: dedup } },
    });

    return { roleId, removed: dedup.length };
  }
}
