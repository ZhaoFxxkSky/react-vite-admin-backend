import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';

export const changePasswordSchema = extendApi(
  z.object({
    oldPassword: extendApi(z.string().min(1), {
      description: '旧密码',
      example: 'OldPass123',
    }),
    newPassword: extendApi(z.string().min(8).max(32), {
      description: '新密码',
      example: 'NewPass456',
    }),
  }),
  { title: 'ChangePasswordDto', description: '修改密码' },
);

export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
