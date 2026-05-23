import { SetMetadata } from '@nestjs/common';

export const API_PERMISSION_KEY = 'api-permission';

export interface ApiPermissionMeta {
  code: string;
  name: string;
  module: string;
  category?: string;
  description?: string;
}

export const ApiPermission = (meta: ApiPermissionMeta) =>
  SetMetadata(API_PERMISSION_KEY, meta);
