import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core';
import {
  DEFAULT_DATA_SCOPE,
  DEFAULT_DATA_DIMENSION,
  DEFAULT_RESOURCE_ENABLED,
} from '@core/data-scope/data-scope.constants';
import {
  DataPermissionResourceMeta,
  DataPermissionActionMeta,
  DataScopeAction,
  DataScopeDimension,
  DataScopeType,
  TreeStrategy,
} from '@core/data-scope/data-scope.types';

interface RawMeta {
  id: number;
  resourceCode: string;
  resourceName: string;
  entity: string;
  treeStrategy: string;
  visibleScope: unknown;
  operateScopes: unknown;
  createOwnershipFields: unknown;
  supportedActions: unknown;
  supportedDimensions: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaveRoleResourceItem {
  resourceCode: string;
  enabled: boolean;
  scopes: Array<{
    action: DataScopeAction;
    scope: DataScopeType;
    dimension: DataScopeDimension;
    customTargets?: number[] | null;
  }>;
}

export interface RoleResourceItem {
  resourceCode: string;
  enabled: boolean;
  scopes: Array<{
    action: DataScopeAction;
    scope: DataScopeType;
    dimension: DataScopeDimension;
    customTargets: number[] | null;
  }>;
}

@Injectable()
export class DataPermissionService {
  constructor(private prisma: PrismaService) {}

  async listResourceMeta(): Promise<DataPermissionResourceMeta[]> {
    const list = await this.prisma.dataPermissionMeta.findMany({
      orderBy: { id: 'asc' },
    });
    return list.map((m) => this.toResourceMeta(m as unknown as RawMeta));
  }

  async getMetaByResourceCode(
    resourceCode: string,
  ): Promise<DataPermissionResourceMeta | null> {
    const meta = await this.prisma.dataPermissionMeta.findUnique({
      where: { resourceCode },
    });
    return meta ? this.toResourceMeta(meta as unknown as RawMeta) : null;
  }

  async getRoleScopeByResource(
    roleIds: number[],
    resourceCode: string,
    action: DataScopeAction,
  ) {
    if (roleIds.length === 0) return null;

    // 排除该资源被禁用（enabled=false）的角色：禁用的角色不参与本次 union
    const disabledRows = await this.prisma.roleResourceConfig.findMany({
      where: {
        roleId: { in: roleIds },
        resourceCode,
        enabled: false,
      },
      select: { roleId: true },
    });
    const disabledRoleIds = new Set(disabledRows.map((r) => r.roleId));
    const activeRoleIds = roleIds.filter((id) => !disabledRoleIds.has(id));

    if (activeRoleIds.length === 0) return null;

    const scopes = await this.prisma.roleDataPermissionScope.findMany({
      where: {
        roleId: { in: activeRoleIds },
        resourceCode,
        action,
      },
    });

    if (scopes.length === 0) return null;

    const priority: Record<string, number> = {
      ALL: 6,
      ORG_AND_CHILD: 5,
      ORG: 4,
      CUSTOM: 3,
      SELF: 2,
      NONE: 1,
    };

    return scopes.reduce((best, cur) =>
      (priority[cur.scope] ?? 0) > (priority[best.scope] ?? 0) ? cur : best,
    );
  }

  async saveRoleScopes(roleId: number, resources: SaveRoleResourceItem[]) {
    await this.prisma.$transaction(async (tx) => {
      // 全量替换：先清空该角色的现有配置
      await tx.roleDataPermissionScope.deleteMany({ where: { roleId } });
      await tx.roleResourceConfig.deleteMany({ where: { roleId } });

      // 仅在 enabled=false 时落库（默认 true 不入库）
      const disabled = resources.filter((r) => r.enabled === false);
      if (disabled.length > 0) {
        await tx.roleResourceConfig.createMany({
          data: disabled.map((r) => ({
            roleId,
            resourceCode: r.resourceCode,
            enabled: false,
          })),
        });
      }

      // 展平所有 scope 行写入（无论 enabled 状态都保留配置）
      const scopeRows = resources.flatMap((r) =>
        r.scopes.map((s) => ({
          roleId,
          resourceCode: r.resourceCode,
          action: s.action,
          scope: s.scope,
          dimension: s.dimension,
          customTargets: s.customTargets ?? undefined,
        })),
      );

      if (scopeRows.length > 0) {
        await tx.roleDataPermissionScope.createMany({
          data: scopeRows,
        });
      }
    });
  }

  async listResourcesByRoleId(roleId: number): Promise<RoleResourceItem[]> {
    const [metas, scopes, configs] = await Promise.all([
      this.listResourceMeta(),
      this.prisma.roleDataPermissionScope.findMany({
        where: { roleId },
      }),
      this.prisma.roleResourceConfig.findMany({
        where: { roleId },
        select: { resourceCode: true, enabled: true },
      }),
    ]);

    // 已保存配置：按 resourceCode → action 索引
    const savedScopeMap = new Map<
      string,
      Map<string, (typeof scopes)[number]>
    >();
    for (const row of scopes) {
      let actionMap = savedScopeMap.get(row.resourceCode);
      if (!actionMap) {
        actionMap = new Map();
        savedScopeMap.set(row.resourceCode, actionMap);
      }
      actionMap.set(row.action, row);
    }

    // 已禁用资源（只在 enabled=false 时入库）
    const enabledMap = new Map<string, boolean>();
    configs.forEach((c) => enabledMap.set(c.resourceCode, c.enabled));

    // 按元数据顺序生成完整列表：缺的部分用默认值填补
    return metas.map((meta) => {
      const savedActions = savedScopeMap.get(meta.resourceCode);
      const supportedActions = meta.supportedActions ?? [];

      const scopeRows = supportedActions.map((action) => {
        const saved = savedActions?.get(action);
        if (saved) {
          return {
            action,
            scope: saved.scope as DataScopeType,
            dimension: saved.dimension as DataScopeDimension,
            customTargets: (saved.customTargets as number[] | null) ?? null,
          };
        }
        return {
          action,
          scope: DEFAULT_DATA_SCOPE as DataScopeType,
          dimension: DEFAULT_DATA_DIMENSION as DataScopeDimension,
          customTargets: null,
        };
      });

      return {
        resourceCode: meta.resourceCode,
        enabled: enabledMap.get(meta.resourceCode) ?? DEFAULT_RESOURCE_ENABLED,
        scopes: scopeRows,
      };
    });
  }

  private toResourceMeta(raw: RawMeta): DataPermissionResourceMeta {
    return {
      resourceCode: raw.resourceCode,
      resourceName: raw.resourceName,
      entityName: raw.entity,
      treeStrategy: raw.treeStrategy as TreeStrategy,
      visibleScope: raw.visibleScope as DataPermissionActionMeta,
      operateScopes:
        (raw.operateScopes as Partial<
          Record<DataScopeAction, DataPermissionActionMeta>
        >) ?? {},
      createOwnershipFields:
        (raw.createOwnershipFields as
          | { deptField?: string; creatorField?: string }
          | null
          | undefined) ?? undefined,
      supportedActions: (raw.supportedActions as DataScopeAction[]) ?? [],
      supportedDimensions:
        (raw.supportedDimensions as DataScopeDimension[]) ?? [],
    };
  }
}
