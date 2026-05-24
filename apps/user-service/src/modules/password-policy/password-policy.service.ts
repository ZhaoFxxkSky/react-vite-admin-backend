import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@core';
import { comparePassword, hashPassword } from '@shared';
import { UpdatePasswordPolicyDto } from './dto';

@Injectable()
export class PasswordPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  // ===================== 策略 CRUD =====================

  async getPolicy() {
    let policy = await this.prisma.passwordPolicy.findFirst({
      orderBy: { id: 'asc' },
    });

    if (!policy) {
      policy = await this.prisma.passwordPolicy.create({
        data: {
          minLength: 8,
          maxLength: 32,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSymbols: false,
          expiryDays: 90,
          historyCount: 5,
          maxLoginAttempts: 5,
          lockoutDuration: 30,
        },
      });
    }

    return policy;
  }

  async updatePolicy(data: UpdatePasswordPolicyDto) {
    const policy = await this.getPolicy();

    const updateData: any = {};
    if (data.minLength !== undefined) updateData.minLength = data.minLength;
    if (data.maxLength !== undefined) updateData.maxLength = data.maxLength;
    if (data.requireUppercase !== undefined)
      updateData.requireUppercase = data.requireUppercase;
    if (data.requireLowercase !== undefined)
      updateData.requireLowercase = data.requireLowercase;
    if (data.requireNumbers !== undefined)
      updateData.requireNumbers = data.requireNumbers;
    if (data.requireSymbols !== undefined)
      updateData.requireSymbols = data.requireSymbols;
    if (data.expiryDays !== undefined) updateData.expiryDays = data.expiryDays;
    if (data.historyCount !== undefined)
      updateData.historyCount = data.historyCount;
    if (data.maxLoginAttempts !== undefined)
      updateData.maxLoginAttempts = data.maxLoginAttempts;
    if (data.lockoutDuration !== undefined)
      updateData.lockoutDuration = data.lockoutDuration;

    if (Object.keys(updateData).length === 0) {
      return policy;
    }

    return this.prisma.passwordPolicy.update({
      where: { id: policy.id },
      data: updateData,
    });
  }

  // ===================== 密码验证 =====================

  async validatePassword(password: string) {
    const policy = await this.getPolicy();

    if (password.length < policy.minLength) {
      throw new BadRequestException(`密码长度不能少于 ${policy.minLength} 位`);
    }

    if (password.length > policy.maxLength) {
      throw new BadRequestException(`密码长度不能超过 ${policy.maxLength} 位`);
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      throw new BadRequestException('密码必须包含大写字母');
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      throw new BadRequestException('密码必须包含小写字母');
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      throw new BadRequestException('密码必须包含数字');
    }

    if (policy.requireSymbols && !/[!@#$%^*&*(),.?":{}|<>]/.test(password)) {
      throw new BadRequestException('密码必须包含特殊字符');
    }

    return true;
  }

  async checkPasswordHistory(userId: number, newPassword: string) {
    const policy = await this.getPolicy();

    if (policy.historyCount <= 0) {
      return false;
    }

    const histories = await this.prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: policy.historyCount,
    });

    for (const history of histories) {
      const matched = await comparePassword(newPassword, history.password);
      if (matched) {
        return true;
      }
    }

    return false;
  }

  async addPasswordHistory(userId: number, password: string) {
    const policy = await this.getPolicy();
    const hashedPassword = await hashPassword(password);

    await this.prisma.passwordHistory.create({
      data: {
        userId,
        password: hashedPassword,
      },
    });

    if (policy.historyCount > 0) {
      const histories = await this.prisma.passwordHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: policy.historyCount,
      });

      if (histories.length > 0) {
        await this.prisma.passwordHistory.deleteMany({
          where: {
            id: { in: histories.map((h) => h.id) },
          },
        });
      }
    }

    return { userId };
  }

  async isPasswordExpired(userId: number) {
    const policy = await this.getPolicy();

    if (policy.expiryDays <= 0) {
      return false;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordChangedAt: true },
    });

    if (!user || !user.passwordChangedAt) {
      return true;
    }

    const expiryDate = new Date(user.passwordChangedAt);
    expiryDate.setDate(expiryDate.getDate() + policy.expiryDays);

    return new Date() > expiryDate;
  }
}
