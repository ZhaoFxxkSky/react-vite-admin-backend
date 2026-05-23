import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core';
import { Prisma } from '@prisma/client';

export interface PermissionItem {
  id: number;
  code: string;
  name: string;
  method: string;
  path: string;
  description: string | null;
  enabled: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryGroup {
  category: string;
  permissions: PermissionItem[];
}

export interface ModuleGroup {
  module: string;
  categories: CategoryGroup[];
}

@Injectable()
export class ApiPermissionService {
  constructor(private readonly prisma: PrismaService) {}

  async tree(): Promise<ModuleGroup[]> {
    const rows = await this.prisma.apiPermission.findMany({
      orderBy: [
        { module: 'asc' },
        { category: 'asc' },
        { sortOrder: 'asc' },
        { id: 'asc' },
      ],
    });

    const moduleMap = new Map<string, Map<string, PermissionItem[]>>();

    for (const row of rows) {
      const category = row.category ?? '默认分组';
      if (!moduleMap.has(row.module)) {
        moduleMap.set(row.module, new Map());
      }
      const catMap = moduleMap.get(row.module)!;
      if (!catMap.has(category)) {
        catMap.set(category, []);
      }
      catMap.get(category)!.push({
        id: row.id,
        code: row.code,
        name: row.name,
        method: row.method,
        path: row.path,
        description: row.description,
        enabled: row.enabled,
        sortOrder: row.sortOrder,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    }

    const result: ModuleGroup[] = [];
    const sortedModules = [...moduleMap.keys()].sort((a, b) =>
      a.localeCompare(b, 'zh-CN'),
    );

    for (const module of sortedModules) {
      const catMap = moduleMap.get(module)!;
      const categories: CategoryGroup[] = [];

      const sortedCats = [...catMap.keys()].sort((a, b) => {
        if (a === '默认分组') return 1;
        if (b === '默认分组') return -1;
        return a.localeCompare(b, 'zh-CN');
      });

      for (const category of sortedCats) {
        categories.push({
          category,
          permissions: catMap.get(category)!,
        });
      }

      result.push({ module, categories });
    }

    return result;
  }

  async toggle(id: number, enabled: boolean): Promise<void> {
    await this.prisma.apiPermission.update({
      where: { id },
      data: { enabled },
    });
  }

  async batchToggle(ids: number[], enabled: boolean): Promise<void> {
    await this.prisma.apiPermission.updateMany({
      where: { id: { in: ids } },
      data: { enabled },
    });
  }

  async cleanDisabled(): Promise<{ deleted: number }> {
    const result = await this.prisma.apiPermission.deleteMany({
      where: { enabled: false },
    });
    return { deleted: result.count };
  }

  async listCodesByUserId(userId: number): Promise<string[]> {
    if (!userId) return [];

    const rows = await this.prisma.apiPermission.findMany({
      where: {
        enabled: true,
        roleApiPermissions: {
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

  async listIdsByRoleId(roleId: number): Promise<number[]> {
    const rows = await this.prisma.roleApiPermission.findMany({
      where: { roleId },
      select: { apiPermissionId: true },
    });
    return rows.map((r) => r.apiPermissionId);
  }

  async setRoleApiPermissions(
    roleId: number,
    apiPermissionIds: number[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx: any) => {
      await tx.roleApiPermission.deleteMany({ where: { roleId } });

      if (apiPermissionIds.length > 0) {
        const dedup = Array.from(new Set(apiPermissionIds));
        const valid = await tx.apiPermission.findMany({
          where: { id: { in: dedup } },
          select: { id: true },
        });
        const validIds = new Set(valid.map((v: any) => v.id));
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
}

