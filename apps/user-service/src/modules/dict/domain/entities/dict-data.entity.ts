export type DictDataStatus = 'active' | 'inactive';

export class DictDataEntity {
  id!: number;
  dictId!: number;
  label!: string;
  value!: string;
  sortOrder!: number;
  status!: DictDataStatus;
  remark!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<DictDataEntity>) {
    Object.assign(this, partial);
  }

  isActive(): boolean {
    return this.status === 'active';
  }
}
