export type OrganizationType = 'company' | 'department' | 'team' | 'group';
export type OrganizationStatus = 'active' | 'inactive';

export class OrganizationEntity {
  id!: number;
  parentId!: number | null;
  code!: string;
  name!: string;
  type!: OrganizationType;
  leaderId!: number | null;
  sortOrder!: number;
  description!: string | null;
  status!: OrganizationStatus;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<OrganizationEntity>) {
    Object.assign(this, partial);
  }

  isRoot(): boolean {
    return this.parentId === null;
  }

  isActive(): boolean {
    return this.status === 'active';
  }
}
