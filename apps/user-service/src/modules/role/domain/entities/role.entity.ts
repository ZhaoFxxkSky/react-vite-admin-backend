export type RoleType = 'system' | 'custom';
export type RoleStatus = 'active' | 'inactive';

export class RoleEntity {
  id!: number;
  name!: string;
  code!: string;
  description!: string | null;
  type!: RoleType;
  level!: number;
  status!: RoleStatus;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<RoleEntity>) {
    Object.assign(this, partial);
  }

  isSystem(): boolean {
    return this.type === 'system';
  }

  isActive(): boolean {
    return this.status === 'active';
  }
}
