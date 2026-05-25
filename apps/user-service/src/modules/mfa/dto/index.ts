import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';

export const setupMfaSchema = extendApi(
  z.object({
    code: extendApi(z.string().length(6), {
      description: 'TOTP 验证码（6位数字）',
      example: '123456',
    }),
  }),
  { title: 'SetupMfaDto', description: '绑定 MFA' },
);

export type SetupMfaDto = z.infer<typeof setupMfaSchema>;

export const verifyMfaSchema = extendApi(
  z.object({
    code: extendApi(z.string().length(6), {
      description: 'TOTP 验证码',
      example: '123456',
    }),
  }),
  { title: 'VerifyMfaDto', description: '验证 MFA' },
);

export type VerifyMfaDto = z.infer<typeof verifyMfaSchema>;

export const recoveryCodeSchema = extendApi(
  z.object({
    code: extendApi(z.string().length(10), {
      description: '备份码（10位字母数字）',
      example: 'A1B2C3D4E5',
    }),
  }),
  { title: 'RecoveryCodeDto', description: '使用备份码' },
);

export type RecoveryCodeDto = z.infer<typeof recoveryCodeSchema>;
