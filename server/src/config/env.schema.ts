import { z } from 'zod';

const envBoolean = z
  .union([
    z.boolean(),
    z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.enum(['true', 'false', '1', '0', 'yes', 'no'])),
  ])
  .transform(
    (value) =>
      value === true || value === 'true' || value === '1' || value === 'yes',
  );

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CLIENT_URL: z.url().default('http://localhost:5173'),
  DATABASE_HOST: z.string().min(1),
  DATABASE_PORT: z.coerce.number().int().positive(),
  DATABASE_USER: z.string().min(1),
  DATABASE_PASSWORD: z.string().min(1),
  DATABASE_NAME: z.string().min(1),
  DATABASE_SSL: envBoolean.default(false),
  TYPEORM_SYNC: envBoolean.default(false),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_BASE_URL: z.url().default('https://api.deepseek.com'),
  DEEPSEEK_MODEL: z.string().default('deepseek-v4-pro'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>) {
  return envSchema.parse(config);
}
