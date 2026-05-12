export const DATA_SCOPE_OPTIONS = [
  { value: 'ALL', label: '全部数据' },
  { value: 'ORG_AND_CHILD', label: '本部门及子部门' },
  { value: 'ORG', label: '本部门数据' },
  { value: 'SELF', label: '仅本人数据' },
  { value: 'CUSTOM', label: '自定义部门' },
  { value: 'NONE', label: '无数据权限' },
] as const;

export const DIMENSION_OPTIONS = [
  { value: 'DEPT', label: '部门' },
  { value: 'REGION', label: '区域' },
] as const;

export const ACTION_OPTIONS = [
  { value: 'view', label: '查看' },
  { value: 'create', label: '新增' },
  { value: 'update', label: '编辑' },
  { value: 'delete', label: '删除' },
  { value: 'export', label: '导出' },
  { value: 'approve', label: '审批' },
  { value: 'assign', label: '分配' },
] as const;

// 未配置数据权限时的默认值（resolver 兜底 + 配置页读时合并都使用）
export const DEFAULT_DATA_SCOPE = 'ORG' as const;
export const DEFAULT_DATA_DIMENSION = 'DEPT' as const;
export const DEFAULT_RESOURCE_ENABLED = true as const;
