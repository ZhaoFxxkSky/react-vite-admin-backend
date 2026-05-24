import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { AppLogger, LogMethod } from '@core';
import { comparePassword, hashPassword } from '@shared';
import { UserRepository } from '../user/infrastructure/repositories/user.repository';
import { PasswordPolicyService } from '../password-policy/password-policy.service';
import { FileService } from '../file/file.service';
import { UpdateProfileDto, ChangePasswordDto } from './dto';

@Injectable()
export class ProfileService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordPolicyService: PasswordPolicyService,
    private readonly fileService: FileService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(ProfileService.name);
  }

  @LogMethod()
  async getProfile(userId: number) {
    const user = await this.userRepository.getById(userId);
    if (!user) throw new NotFoundException('User not found');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...rest } = user;
    return rest;
  }

  @LogMethod()
  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const existing = await this.userRepository.getById(userId);
    if (!existing) throw new NotFoundException('User not found');

    if (dto.email && dto.email !== existing.email) {
      const dup = await this.userRepository.getByEmail(dto.email);
      if (dup && dup.id !== userId) {
        throw new ConflictException('Email already exists');
      }
    }
    if (dto.phone && dto.phone !== existing.phone) {
      const dup = await this.userRepository.getByPhone(dto.phone);
      if (dup && dup.id !== userId) {
        throw new ConflictException('Phone already exists');
      }
    }

    const updated = await this.userRepository.updateById(userId, dto as any);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...rest } = updated;
    return rest;
  }

  @LogMethod()
  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.userRepository.getById(userId);
    if (!user) throw new NotFoundException('User not found');

    const valid = await comparePassword(dto.oldPassword, user.password);
    if (!valid) {
      throw new ForbiddenException('Old password is incorrect');
    }

    // 检查密码策略
    try {
      await this.passwordPolicyService.validatePassword(dto.newPassword);
    } catch (e: any) {
      throw new ForbiddenException(e.message);
    }

    // 检查历史密码
    const isHistory = await this.passwordPolicyService.checkPasswordHistory(
      userId,
      dto.newPassword,
    );
    if (isHistory) {
      throw new ForbiddenException(
        'New password cannot be the same as recent passwords',
      );
    }

    const hashed = await hashPassword(dto.newPassword);
    await this.userRepository.updateById(userId, {
      password: hashed,
      passwordChangedAt: new Date(),
    } as any);

    // 添加到历史密码
    await this.passwordPolicyService.addPasswordHistory(userId, hashed);

    this.logger.info(`Password changed: userId=${userId}`);
    return { message: 'Password changed successfully' };
  }

  @LogMethod()
  async uploadAvatar(userId: number, file: Express.Multer.File) {
    // 校验文件
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 2MB');
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only jpg/png allowed');
    }

    // 上传文件
    const originalname = Buffer.from(file.originalname, 'latin1').toString(
      'utf8',
    );
    const uploaded = await this.fileService.upload(
      {
        originalname,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      },
      userId,
    );

    // 更新用户头像
    await this.userRepository.updateById(userId, {
      avatar: uploaded.url,
    } as any);

    this.logger.info(
      `Avatar uploaded: userId=${userId}, fileId=${uploaded.id}`,
    );
    return { avatar: uploaded.url };
  }
}
