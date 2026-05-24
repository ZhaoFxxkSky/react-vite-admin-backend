import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core';

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  fromName: string;
  fromEmail: string;
  enabled: boolean;
}

export interface SmsConfig {
  provider: string;
  accessKey: string;
  secretKey: string;
  signName: string;
  enabled: boolean;
}

export interface SecurityConfig {
  maxLoginAttempts: number;
  lockoutDuration: number;
  passwordExpiryDays: number;
  sessionTimeout: number;
  requireCaptcha: boolean;
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getEmailConfig(): Promise<EmailConfig> {
    const configs = await this.getConfigsByGroup('email');
    return {
      smtpHost: configs.smtpHost || '',
      smtpPort: parseInt(configs.smtpPort || '587'),
      smtpUser: configs.smtpUser || '',
      smtpPass: configs.smtpPass || '',
      fromName: configs.fromName || '',
      fromEmail: configs.fromEmail || '',
      enabled: configs.enabled === 'true',
    };
  }

  async setEmailConfig(config: EmailConfig) {
    await this.setConfigsByGroup('email', {
      smtpHost: config.smtpHost,
      smtpPort: String(config.smtpPort),
      smtpUser: config.smtpUser,
      smtpPass: config.smtpPass,
      fromName: config.fromName,
      fromEmail: config.fromEmail,
      enabled: String(config.enabled),
    });
    return config;
  }

  async getSmsConfig(): Promise<SmsConfig> {
    const configs = await this.getConfigsByGroup('sms');
    return {
      provider: configs.provider || '',
      accessKey: configs.accessKey || '',
      secretKey: configs.secretKey || '',
      signName: configs.signName || '',
      enabled: configs.enabled === 'true',
    };
  }

  async setSmsConfig(config: SmsConfig) {
    await this.setConfigsByGroup('sms', {
      provider: config.provider,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
      signName: config.signName,
      enabled: String(config.enabled),
    });
    return config;
  }

  async getSecurityConfig(): Promise<SecurityConfig> {
    const configs = await this.getConfigsByGroup('security');
    return {
      maxLoginAttempts: parseInt(configs.maxLoginAttempts || '5'),
      lockoutDuration: parseInt(configs.lockoutDuration || '30'),
      passwordExpiryDays: parseInt(configs.passwordExpiryDays || '90'),
      sessionTimeout: parseInt(configs.sessionTimeout || '60'),
      requireCaptcha: configs.requireCaptcha === 'true',
    };
  }

  async setSecurityConfig(config: SecurityConfig) {
    await this.setConfigsByGroup('security', {
      maxLoginAttempts: String(config.maxLoginAttempts),
      lockoutDuration: String(config.lockoutDuration),
      passwordExpiryDays: String(config.passwordExpiryDays),
      sessionTimeout: String(config.sessionTimeout),
      requireCaptcha: String(config.requireCaptcha),
    });
    return config;
  }

  async getBrandConfig() {
    const configs = await this.getConfigsByGroup('brand');
    return {
      systemName: configs.systemName || 'Data Space',
      logo: configs.logo || '',
      primaryColor: configs.primaryColor || '#1890ff',
      loginBackground: configs.loginBackground || '',
      copyright: configs.copyright || '© 2024 Data Space',
    };
  }

  async setBrandConfig(config: any) {
    const configs: Record<string, string> = {
      systemName: config.systemName,
      logo: config.logo,
      primaryColor: config.primaryColor,
      copyright: config.copyright,
    };
    if (config.loginBackground !== undefined) {
      configs.loginBackground = config.loginBackground;
    }
    await this.setConfigsByGroup('brand', configs);
    return config;
  }

  private async getConfigsByGroup(group: string): Promise<Record<string, string>> {
    const configs = await this.prisma.sysConfig.findMany({
      where: { group },
    });
    const result: Record<string, string> = {};
    for (const config of configs) {
      result[config.key] = config.value;
    }
    return result;
  }

  private async setConfigsByGroup(group: string, configs: Record<string, string>) {
    for (const [key, value] of Object.entries(configs)) {
      await this.prisma.sysConfig.upsert({
        where: { key },
        update: { value },
        create: {
          key,
          value,
          group,
          name: key,
          type: 'string',
        },
      });
    }
  }
}
