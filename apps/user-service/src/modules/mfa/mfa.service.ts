import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@core';
import { AppLogger } from '@core';
import * as crypto from 'crypto';

@Injectable()
export class MfaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(MfaService.name);
  }

  // 生成 TOTP Secret
  async generateSecret(userId: number) {
    const secret = this.generateRandomSecret();
    
    // 临时存储，等验证后才启用
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret },
    });

    // 生成 QR Code URL（Google Authenticator 格式）
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, email: true },
    });

    const issuer = 'DataSpace';
    const account = user?.email || user?.username || String(userId);
    const qrCodeUrl = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}`;

    return {
      secret,
      qrCodeUrl,
    };
  }

  // 验证并启用 MFA
  async verifyAndEnable(userId: number, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true },
    });

    if (!user?.mfaSecret) {
      throw new BadRequestException('MFA not setup');
    }

    const valid = this.verifyTOTPCore(user.mfaSecret, code);
    if (!valid) {
      throw new BadRequestException('Invalid TOTP code');
    }

    // 生成备份码
    const backupCodes = this.generateBackupCodes();
    
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaBackupCodes: JSON.stringify(backupCodes),
      },
    });

    this.logger.info(`MFA enabled: userId=${userId}`);
    return {
      backupCodes,
    };
  }

  // 禁用 MFA
  async disable(userId: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: null,
      },
    });

    this.logger.info(`MFA disabled: userId=${userId}`);
    return { message: 'MFA disabled' };
  }

  // 验证 TOTP 码（对外接口）
  async verifyUserTOTP(userId: number, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true, mfaEnabled: true },
    });

    if (!user?.mfaEnabled || !user.mfaSecret) {
      return false;
    }

    return this.verifyTOTPCore(user.mfaSecret, code);
  }

  // 验证备份码
  async verifyBackupCode(userId: number, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaBackupCodes: true },
    });

    if (!user?.mfaBackupCodes) {
      return false;
    }

    const codes: string[] = JSON.parse(user.mfaBackupCodes);
    const index = codes.indexOf(code);

    if (index === -1) {
      return false;
    }

    // 使用后删除该备份码
    codes.splice(index, 1);
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaBackupCodes: JSON.stringify(codes) },
    });

    this.logger.info(`Backup code used: userId=${userId}`);
    return true;
  }

  // 重新生成备份码
  async regenerateBackupCodes(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true },
    });

    if (!user?.mfaEnabled) {
      throw new BadRequestException('MFA not enabled');
    }

    const backupCodes = this.generateBackupCodes();
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaBackupCodes: JSON.stringify(backupCodes) },
    });

    return { backupCodes };
  }

  // 获取 MFA 状态
  async getStatus(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true },
    });

    return {
      enabled: user?.mfaEnabled ?? false,
    };
  }

  // ========== 私有方法 ==========

  private generateRandomSecret(): string {
    // 生成 32 字符的 base32 密钥
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  }

  private verifyTOTPCore(secret: string, code: string): boolean {
    // 使用原生 crypto 实现 TOTP 验证
    const now = Math.floor(Date.now() / 1000);
    const timeStep = 30; // 30 秒窗口
    
    // 检查当前窗口和前/后一个窗口（容差）
    for (let i = -1; i <= 1; i++) {
      const counter = Math.floor((now + i * timeStep) / timeStep);
      const expectedCode = this.generateTOTP(secret, counter);
      if (expectedCode === code) {
        return true;
      }
    }
    
    return false;
  }

  private generateTOTP(secret: string, counter: number): string {
    // Base32 解码
    const key = this.base32Decode(secret);
    
    // 将 counter 转为 8 字节 buffer
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(BigInt(counter), 0);
    
    // HMAC-SHA1
    const hmac = crypto.createHmac('sha1', key);
    hmac.update(buf);
    const hash = hmac.digest();
    
    // 动态截断
    const offset = hash[hash.length - 1] & 0x0f;
    const code = ((hash[offset] & 0x7f) << 24 |
                  (hash[offset + 1] & 0xff) << 16 |
                  (hash[offset + 2] & 0xff) << 8 |
                  (hash[offset + 3] & 0xff)) % 1000000;
    
    return code.toString().padStart(6, '0');
  }

  private base32Decode(str: string): Buffer {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    
    for (const char of str.toUpperCase()) {
      const val = chars.indexOf(char);
      if (val === -1) continue;
      bits += val.toString(2).padStart(5, '0');
    }
    
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      bytes.push(parseInt(bits.substring(i, i + 8), 2));
    }
    
    return Buffer.from(bytes);
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    
    for (let i = 0; i < 10; i++) {
      let code = '';
      for (let j = 0; j < 10; j++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      codes.push(code);
    }
    
    return codes;
  }
}
