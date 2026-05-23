export type DictTypeStatus = 'active' | 'inactive';

export class DictTypeEntity {
  id!: number;
  code!: string;
  name!: string;
  description!: string | null;
  status!: DictTypeStatus;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<DictTypeEntity>) {
    Object.assign(this, partial);
  }

  isActive(): boolean {
    return this.status === 'active';
  }
}
