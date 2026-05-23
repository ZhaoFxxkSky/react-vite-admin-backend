/**
 * 数据权限范围类型
 */
export type DataScopeType =
  | 'ALL'
  | 'ORG_AND_CHILD'
  | 'ORG'
  | 'SELF'
  | 'CUSTOM'
  | 'NONE';

/**
 * 数据权限维度
 */
export type DataScopeDimension = 'DEPT' | 'REGION';

/**
 * 数据权限支持的操作类型
 */
export type DataScopeAction =
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'export'
  | 'approve'
  | 'assign';

/**
 * 树形查询策略
 */
export type TreeStrategy = 'NONE' | 'ANCESTOR_PLUS_SUBTREE';

/**
 * 单个操作的数据权限元数据
 */
export interface DataPermissionActionMeta {
  dimension: DataScopeDimension;
  fieldPath: string;
  selfFieldPath?: string;
  relationPath?: string;
}

/**
 * 资源数据权限元数据（从 data_permission_resource_meta 表读取）
 */
export interface DataPermissionResourceMeta {
  resourceCode: string;
  resourceName: string;
  entityName: string;
  treeStrategy: TreeStrategy;
  visibleScope: DataPermissionActionMeta;
  operateScopes: Partial<Record<DataScopeAction, DataPermissionActionMeta>>;
  createOwnershipFields?: {
    deptField?: string;
    creatorField?: string;
  };
  supportedActions: DataScopeAction[];
  supportedDimensions: DataScopeDimension[];
}

/**
 * 角色数据权限配置（从 role_data_permission_scopes 表读取）
 */
export interface RoleDataPermissionScope {
  roleId: number;
  resourceCode: string;
  action: DataScopeAction;
  scope: DataScopeType;
  dimension: DataScopeDimension;
  customTargets: number[] | null;
}

/**
 * 解析数据权限所需的最小用户信息
 */
export interface DataScopeUser {
  id: number;
  isSuperAdmin?: boolean;
}

/**
 * 前端下拉选项结构
 */
export interface DataScopeOption {
  value: string;
  label: string;
}
