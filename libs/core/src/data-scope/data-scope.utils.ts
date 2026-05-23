export const ACTION_ALIAS: Record<string, string> = {
  list: 'view',
  detail: 'view',
  page: 'view',
  read: 'view',
  view: 'view',
  create: 'create',
  add: 'create',
  save: 'create',
  update: 'update',
  edit: 'update',
  modify: 'update',
  delete: 'delete',
  remove: 'delete',
  export: 'export',
  approve: 'approve',
  assign: 'assign',
  allocate: 'assign',
  dispatch: 'assign',
};

export function parsePermissionCode(code: string): {
  resourceCode: string;
  action: string;
} {
  const segments = code.split(':');
  if (segments.length < 2) {
    return { resourceCode: code, action: 'view' };
  }
  const tail = segments[segments.length - 1].toLowerCase();
  const action = ACTION_ALIAS[tail] ?? 'view';
  const resourceCode = segments.slice(0, -1).join(':');
  return { resourceCode, action };
}
