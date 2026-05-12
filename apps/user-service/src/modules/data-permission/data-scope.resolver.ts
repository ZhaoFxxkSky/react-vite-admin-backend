import { Injectable } from '@nestjs/common';
import {
  IDataScopeResolver,
  DataScopeContext,
} from '@core/interceptors/data-scope.interceptor';
import {
  DEFAULT_DATA_SCOPE,
  DEFAULT_DATA_DIMENSION,
} from '@core/data-scope/data-scope.constants';
import {
  DataScopeUser,
  DataScopeAction,
  DataPermissionResourceMeta,
  DataPermissionActionMeta,
} from '@core/data-scope/data-scope.types';
import { RoleService } from '../role/role.service';
import { OrganizationService } from '../organization/organization.service';
import { DataPermissionService } from './data-permission.service';

@Injectable()
export class UserDataScopeResolver implements IDataScopeResolver {
  constructor(
    private roleService: RoleService,
    private orgService: OrganizationService,
    private dataPermService: DataPermissionService,
  ) {}

  async resolve(
    user: DataScopeUser,
    resourceCode: string,
    action: DataScopeAction,
  ): Promise<DataScopeContext | null> {
    const meta = await this.dataPermService.getMetaByResourceCode(resourceCode);
    if (!meta) {
      return null;
    }

    const actionMeta = this.pickActionMeta(meta, action);
    if (!actionMeta) {
      return null;
    }

    const roleIds = await this.roleService.listIdsByUserId(user.id);
    const scopeConfig = await this.dataPermService.getRoleScopeByResource(
      roleIds,
      resourceCode,
      action,
    );

    const scope = scopeConfig?.scope ?? DEFAULT_DATA_SCOPE;
    const dimension = scopeConfig?.dimension ?? DEFAULT_DATA_DIMENSION;
    const customTargets =
      (scopeConfig?.customTargets as number[] | null) ?? null;

    const primaryOrgId = await this.orgService.findPrimaryOrgIdByUserId(
      user.id,
    );

    const accessibleOrgIds = await this.expandOrgIds(
      primaryOrgId,
      scope,
      customTargets,
      meta.treeStrategy,
    );

    return {
      scope,
      dimension,
      accessibleOrgIds,
      userId: user.id,
      isSuperAdmin: user.isSuperAdmin ?? false,
      entityName: meta.entityName,
      fieldPath: actionMeta.fieldPath,
      selfFieldPath: actionMeta.selfFieldPath ?? undefined,
      relationPath: actionMeta.relationPath ?? undefined,
    };
  }

  private pickActionMeta(
    meta: DataPermissionResourceMeta,
    action: DataScopeAction,
  ): DataPermissionActionMeta | null {
    if (action === 'view') {
      return meta.visibleScope ?? null;
    }
    return meta.operateScopes?.[action] ?? meta.visibleScope ?? null;
  }

  private async expandOrgIds(
    organizationId: number | null,
    scope: string,
    customTargets: number[] | null,
    treeStrategy: string,
  ): Promise<number[] | null> {
    switch (scope) {
      case 'ALL':
        return null;
      case 'NONE':
        return [];
      case 'SELF':
        return [];
      case 'ORG':
        return organizationId ? [organizationId] : [];
      case 'ORG_AND_CHILD': {
        if (!organizationId) return [];
        if (treeStrategy === 'ANCESTOR_PLUS_SUBTREE') {
          return this.orgService.listDescendantIds(organizationId);
        }
        return [organizationId];
      }
      case 'CUSTOM':
        return customTargets ?? [];
      default:
        return [];
    }
  }
}
