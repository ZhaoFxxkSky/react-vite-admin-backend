import { AsyncLocalStorage } from 'async_hooks';

export interface DataScopeContext {
  scope: string;
  dimension: string;
  accessibleOrgIds: number[] | null;
  userId: number;
  isSuperAdmin: boolean;
  entityName?: string;
  fieldPath?: string;
  selfFieldPath?: string;
  relationPath?: string;
}

export const dataScopeALS = new AsyncLocalStorage<DataScopeContext>();

export function getCurrentDataScope(): DataScopeContext | undefined {
  return dataScopeALS.getStore();
}
