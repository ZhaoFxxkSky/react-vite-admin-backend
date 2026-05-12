export interface JwtPayload {
  sub: number;
  username: string;
  email: string | null;
  isSuperAdmin: boolean;
}

export interface AuthenticatedUser {
  id: number;
  username: string;
  email: string | null;
  organizationId: number | null;
  isSuperAdmin: boolean;
  apiPermissions: string[];
  jti?: string;
}
