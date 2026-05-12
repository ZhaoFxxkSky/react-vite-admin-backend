import { z } from 'zod';

const dbSingleSchema = z.object({
  host: z.string().default('localhost'),
  port: z.number().default(3306),
  user: z.string().default('root'),
  password: z.string().default('root'),
  database: z.string().default('data_space'),
});

export const configSchema = z.object({
  app: z.object({
    port: z.number().default(3000),
    env: z.enum(['development', 'production', 'test']).default('development'),
  }),

  database: z.object({
    primary: dbSingleSchema,
    report: dbSingleSchema.optional(),
    audit: dbSingleSchema.optional(),
  }),

  redis: z.object({
    host: z.string().default('localhost'),
    port: z.number().default(6379),
    password: z.string().optional(),
    db: z.number().default(0),
  }),

  jwt: z.object({
    secret: z.string().min(16),
    expiresIn: z.string().default('15m'),
    refreshSecret: z.string().min(16),
    refreshExpiresIn: z.string().default('7d'),
  }),

  storage: z.object({
    type: z.enum(['local', 'minio', 'oss']).default('local'),
    local: z
      .object({
        path: z.string().default('uploads'),
      })
      .optional(),
    minio: z
      .object({
        endpoint: z.string().optional(),
        port: z.number().optional(),
        accessKey: z.string().optional(),
        secretKey: z.string().optional(),
        bucket: z.string().optional(),
      })
      .optional(),
  }),
});

export type AppConfig = z.infer<typeof configSchema>;
