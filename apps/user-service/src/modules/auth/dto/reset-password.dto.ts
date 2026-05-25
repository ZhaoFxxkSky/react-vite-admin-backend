import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';

export const resetPasswordSchema = extendApi(
  z.object({
    username: extendApi(z.string().min(1).max(50), {
      description: '用户名',
      example: 'admin',
    }),
    code: extendApi(z.string().length(6), {
      description: '验证码（6位数字）',
      example: '123456',
    }),
    newPassword: extendApi(z.string().min(8).max(32), {
      description: '新密码',
      example: 'NewPass123',
    }),
  }),
  { title: 'ResetPasswordDto', description: '重置密码请求' },
);

export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
