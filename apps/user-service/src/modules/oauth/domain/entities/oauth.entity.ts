export class OAuthEntity {
  id!: number;
  userId!: number;
  provider!: string;
  providerId!: string;
  unionId!: string | null;
  accessToken!: string | null;
  refreshToken!: string | null;
  expiresAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<OAuthEntity>) {
    Object.assign(this, partial);
  }

  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }
}
