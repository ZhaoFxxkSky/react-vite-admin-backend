import { UserEntity } from '../../domain/entities/user.entity';

export class UserMapper {
  static toDomain(row: any): UserEntity {
    return new UserEntity({
      id: row.id,
      username: row.username,
      email: row.email,
      phone: row.phone,
      password: row.password,
      realName: row.realName,
      nickName: row.nickName,
      avatar: row.avatar,
      gender: row.gender as any,
      birthday: row.birthday ?? null,
      employeeNo: row.employeeNo,
      jobTitle: row.jobTitle,
      isSuperAdmin: row.isSuperAdmin ?? false,
      status: row.status as any,
      lastLoginAt: row.lastLoginAt,
      lastLoginIp: row.lastLoginIp,
      loginFailCount: row.loginFailCount ?? 0,
      passwordChangedAt: row.passwordChangedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(entity: UserEntity): any {
    return {
      username: entity.username,
      email: entity.email,
      phone: entity.phone,
      password: entity.password,
      realName: entity.realName,
      nickName: entity.nickName,
      avatar: entity.avatar,
      gender: entity.gender,
      birthday: entity.birthday ?? null,
      employeeNo: entity.employeeNo,
      jobTitle: entity.jobTitle,
      isSuperAdmin: entity.isSuperAdmin ?? false,
      status: entity.status,
    };
  }
}
