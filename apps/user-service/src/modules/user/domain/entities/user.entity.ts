import { UserStatus } from '@shared';

export class UserEntity {
  id!: number;
  username!: string;
  email!: string | null;
  phone!: string | null;
  password!: string;
  realName!: string | null;
  nickName!: string | null;
  avatar!: string | null;
  gender!: 'male' | 'female' | 'unknown';
  birthday!: Date | null;
  employeeNo!: string | null;
  jobTitle!: string | null;
  isSuperAdmin!: boolean;
  status!: UserStatus;
  lastLoginAt!: Date | null;
  lastLoginIp!: string | null;
  loginFailCount!: number;
  passwordChangedAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }

  isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }
}
