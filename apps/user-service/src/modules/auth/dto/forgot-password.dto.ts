import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';

export const forgotPasswordSchema = extendApi(
  z.object({
    username: extendApi(z.string().min(1).max(50), {
      description: '用户名',
      example: 'admin',
    }),
  }),
  { title: 'ForgotPasswordDto', description: '忘记密码请求' },
);

export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
