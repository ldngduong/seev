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

const optionalUrl = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.url().optional(),
);

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CLIENT_URL: z.url().default('http://localhost:5175'),
  DATABASE_HOST: z.string().min(1),
  DATABASE_PORT: z.coerce.number().int().positive(),
  DATABASE_USER: z.string().min(1),
  DATABASE_PASSWORD: z.string().min(1),
  DATABASE_NAME: z.string().min(1),
  DATABASE_SSL: envBoolean.default(false),
  TYPEORM_SYNC: envBoolean.default(false),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  BULL_BOARD_ROUTE: z.string().min(1).default('/queues'),
  BULL_BOARD_USER: z.string().min(1).default('admin'),
  BULL_BOARD_PASSWORD: z.string().min(1).default('admin123'),
  JWT_SECRET: z.string().min(32).default('dev-only-change-this-jwt-secret-key-32-chars'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  AUTH_COOKIE_NAME: z.string().min(1).default('access_token'),
  AUTH_COOKIE_MAX_AGE_SECONDS: z.coerce.number().int().positive().default(604800),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_BASE_URL: optionalUrl,
  R2_SIGNED_URL_EXPIRES_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(900),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z
    .url()
    .default('http://localhost:3000/auth/google/callback'),
  GOOGLE_SUCCESS_REDIRECT_URL: z
    .url()
    .default('http://localhost:5175/auth/google/success'),
  GOOGLE_FAILURE_REDIRECT_URL: z
    .url()
    .default('http://localhost:5175/login?error=google_auth_failed'),
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_BASE_URL: z.url().default('https://api.deepseek.com'),
  DEEPSEEK_MODEL: z.string().default('deepseek-v4-pro'),
  JOB_RESEARCH_DEFAULT_SOURCES: z
    .string()
    .min(1)
    .default('topcv,vietnamworks,indeed'),
  JOB_RESEARCH_MAX_JOBS_PER_SOURCE: z.coerce
    .number()
    .int()
    .positive()
    .default(20),
  JOB_RESEARCH_CACHE_TTL_HOURS: z.coerce
    .number()
    .int()
    .positive()
    .default(12),
  JOB_RESEARCH_HTTP_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(30000),
  BRIGHTDATA_API_KEY: z.string().optional(),
  BRIGHTDATA_REQUEST_URL: z
    .url()
    .default('https://api.brightdata.com/request'),
  BRIGHTDATA_ZONE: z.string().default('web_unlocker1'),
  BRIGHTDATA_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(120000),
  TOPCV_ENABLED: envBoolean.default(true),
  TOPCV_BASE_URL: z.url().default('https://www.topcv.vn'),
  TOPCV_SEARCH_URL_TEMPLATE: z.string().min(1),
  TOPCV_MAX_DETAIL_JOBS: z.coerce.number().int().min(0).default(12),
  VIETNAMWORKS_ENABLED: envBoolean.default(true),
  VIETNAMWORKS_BASE_URL: z.url().default('https://www.vietnamworks.com'),
  VIETNAMWORKS_SEARCH_URL: z.url(),
  INDEED_ENABLED: envBoolean.default(true),
  INDEED_BASE_URL: z.url().default('https://vn.indeed.com'),
  INDEED_SEARCH_URL_TEMPLATE: z.string().min(1),
  INDEED_MAX_DETAIL_JOBS: z.coerce.number().int().min(0).default(0),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>) {
  return envSchema.parse(config);
}
