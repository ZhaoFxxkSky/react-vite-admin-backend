export type ConfigType = 'string' | 'number' | 'boolean' | 'json';
export type ConfigStatus = 'active' | 'inactive';

export class ConfigEntity {
  id!: number;
  key!: string;
  value!: string;
  type!: ConfigType;
  group!: string;
  name!: string;
  description!: string | null;
  isBuiltIn!: boolean;
  status!: ConfigStatus;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<ConfigEntity>) {
    Object.assign(this, partial);
  }

  getTypedValue(): string | number | boolean | any {
    switch (this.type) {
      case 'number':
        return Number(this.value);
      case 'boolean':
        return this.value === 'true' || this.value === '1';
      case 'json':
        try {
          return JSON.parse(this.value);
        } catch {
          return this.value;
        }
      default:
        return this.value;
    }
  }

  isActive(): boolean {
    return this.status === 'active';
  }
}
