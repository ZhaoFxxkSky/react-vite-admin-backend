export const PermissionTypes = [
  'catalog',
  'menu',
  'embedded',
  'link',
  'button',
] as const;
export type PermissionType = (typeof PermissionTypes)[number];

export const PermissionStatuses = ['active', 'inactive'] as const;
export type PermissionStatus = (typeof PermissionStatuses)[number];

export const BadgeVariants = [
  'default',
  'destructive',
  'primary',
  'success',
  'warning',
] as const;
export const BadgeTypes = ['dot', 'normal'] as const;

/** 权限节点的菜单/路由元数据 */
export interface PermissionMeta {
  activeIcon?: string;
  activePath?: string;
  affixTab?: boolean;
  affixTabOrder?: number;
  badge?: string;
  badgeType?: (typeof BadgeTypes)[number];
  badgeVariants?: (typeof BadgeVariants)[number];
  hideChildrenInMenu?: boolean;
  hideInBreadcrumb?: boolean;
  hideInMenu?: boolean;
  hideInTab?: boolean;
  icon?: string;
  iframeSrc?: string;
  keepAlive?: boolean;
  link?: string;
  maxNumOfOpenTab?: number;
  noBasicLayout?: boolean;
  openInNewWindow?: boolean;
  order?: number;
  query?: Record<string, any>;
  title?: string;
  [key: string]: any;
}

export class PermissionEntity {
  id!: number;
  pid!: number;

  // 权限标识
  code!: string;

  // 路由信息
  type!: PermissionType;
  name!: string | null;
  path!: string | null;
  component!: string | null;
  redirect!: string | null;

  // 菜单元数据
  handle!: PermissionMeta | null;

  // 排序/审计
  sortOrder!: number;
  isSensitive!: boolean;
  status!: PermissionStatus;
  isBuiltIn!: boolean;
  description!: string | null;

  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<PermissionEntity>) {
    Object.assign(this, partial);
  }

  isMenuLike(): boolean {
    return this.type !== 'button';
  }

  isButton(): boolean {
    return this.type === 'button';
  }
}
