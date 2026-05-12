import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';

export const changePasswordSchema = extendApi(
  z.object({
    oldPassword: extendApi(z.string().min(8).max(100), {
      description: '原密码',
      example: 'Old123456!',
    }),
    newPassword: extendApi(z.string().min(8).max(100), {
      description: '新密码',
      example: 'New123456!',
    }),
  }),
  { title: 'ChangePasswordDto', description: '修改密码请求参数' },
);

export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
