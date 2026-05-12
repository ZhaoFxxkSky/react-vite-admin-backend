import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@core';
import { TreeUtil } from '@shared';
import { PermissionEntity } from './domain/entities/permission.entity';
import { PermissionRepository } from './infrastructure/repositories/permission.repository';
import { ListPermissionByPageDto } from './dto';

export interface CreatePermissionInput {
  pid?: number | null;
  code: string;
  type?: string | null;
  name?: string | null;
  path?: string | null;
  component?: string | null;
  redirect?: string | null;
  handle?: Record<string, any> | null;
  sortOrder?: number | null;
  isSensitive?: boolean | null;
  status?: string | null;
  isBuiltIn?: boolean | null;
  description?: string | null;
}

export type UpdatePermissionInput = Partial<CreatePermissionInput>;

@Injectable()
export class PermissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permRepo: PermissionRepository,
  ) {}

  // ===================== 权限定义 CRUD =====================
  async listByPage(query: ListPermissionByPageDto) {
    return this.permRepo.listByPage(query);
  }

  async getById(id: number) {
    const perm = await this.permRepo.getById(id);
    if (!perm) throw new NotFoundException(`Permission ${id} not found`);
    return perm;
  }

  async save(data: CreatePermissionInput) {
    return this.permRepo.save(
      new PermissionEntity({
        pid: data.pid ?? 0,
        code: data.code,
        type: (data.type || 'menu') as any,
        name: data.name ?? null,
        path: data.path ?? null,
        component: data.component ?? null,
        redirect: data.redirect ?? null,
        handle: (data.handle as any) ?? null,
        sortOrder: data.sortOrder ?? 0,
        isSensitive: data.isSensitive ?? false,
        status: (data.status || 'active') as any,
        isBuiltIn: data.isBuiltIn ?? false,
        description: data.description ?? null,
      }),
    );
  }

  async updateById(id: number, patch: UpdatePermissionInput) {
    const existing = await this.permRepo.getById(id);
    if (!existing) throw new NotFoundException(`Permission ${id} not found`);

    const updated = await this.permRepo.updateById(id, patch as any);
    if (!updated) throw new NotFoundException(`Permission ${id} not found`);
    return updated;
  }

  async removeById(id: number) {
    const existing = await this.permRepo.getById(id);
    if (!existing) throw new NotFoundException(`Permission ${id} not found`);
    if (existing.isBuiltIn) {
      throw new BadRequestException(`Built-in permission cannot be deleted`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { permissionId: id } });
      await tx.permission.updateMany({
        where: { pid: id },
        data: { pid: 0 },
      });
      await tx.permission.delete({ where: { id } });
    });
    return { id };
  }

  // ===================== 权限树查询 =====================

  async listTree() {
    const rows = await this.permRepo.listMenu();
    return TreeUtil.buildTree(rows, { parentKey: 'pid', sort: true });
  }

  // ===================== 用户权限查询 =====================

  /**
   * 查询某个用户拥有的所有权限 code(去重)
   * 链路: user_roles → roles → role_permissions → permissions
   */
  async listCodesByUserId(userId: number): Promise<string[]> {
    if (!userId) return [];

    const rows = await this.prisma.permission.findMany({
      where: {
        status: 'active',
        rolePermissions: {
          some: {
            role: {
              status: 'active',
              userRoles: {
                some: { userId },
              },
            },
          },
        },
      },
      select: { code: true },
    });

    return [...new Set(rows.map((r) => r.code))];
  }

  /**
   * 查询某个用户可见的菜单(树形)
   * 仅返回 status = 'active' 的权限节点
   */
  async listMenuByUserId(userId: number) {
    if (!userId) return [];

    const rows = await this.prisma.permission.findMany({
      where: {
        status: 'active',
        rolePermissions: {
          some: {
            role: {
              status: 'active',
              userRoles: {
                some: { userId },
              },
            },
          },
        },
        type: {
          not: 'button',
        },
      },
      select: {
        id: true,
        pid: true,
        code: true,
        type: true,
        name: true,
        path: true,
        component: true,
        redirect: true,
        handle: true,
        sortOrder: true,
      },
    });

    const dedup = Array.from(new Map(rows.map((r) => [r.id, r])).values());

    return TreeUtil.buildTree(dedup, { parentKey: 'pid', sort: true });
  }
}
