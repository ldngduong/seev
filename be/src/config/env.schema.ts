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
  (value) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
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
  JWT_SECRET: z
    .string()
    .min(32)
    .default('dev-only-change-this-jwt-secret-key-32-chars'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_ISSUER: z.string().min(1).default('seev-api'),
  JWT_AUDIENCE: z.string().min(1).default('seev-web'),
  REFRESH_TOKEN_SECRET: z
    .string()
    .min(32)
    .default('dev-only-change-refresh-secret-32-chars'),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(2592000),
  AUTH_COOKIE_NAME: z.string().min(1).default('access_token'),
  AUTH_COOKIE_MAX_AGE_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_COOKIE_NAME: z.string().min(1).default('refresh_token'),
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
  FIRECRAWL_API_KEY: z.string().optional(),
  FIRECRAWL_BASE_URL: z.url().default('https://api.firecrawl.dev/v2'),
  CV_AUDIT_BATCH_TARGET_CHARACTERS: z.coerce
    .number()
    .int()
    .positive()
    .default(1600),
  CV_AUDIT_BATCH_MAX_LINES: z.coerce.number().int().positive().default(12),
  CV_AUDIT_COVERAGE_TARGET_CHARACTERS: z.coerce
    .number()
    .int()
    .positive()
    .default(2800),
  CV_AUDIT_COVERAGE_MAX_LINES: z.coerce.number().int().positive().default(20),
  CV_AUDIT_CONCURRENCY: z.coerce.number().int().positive().default(6),
  JOB_RESEARCH_DEFAULT_SOURCES: z
    .string()
    .min(1)
    .default('topcv,vietnamworks,itviec'),
  JOB_RESEARCH_MAX_JOBS_PER_SOURCE: z.coerce
    .number()
    .int()
    .positive()
    .default(100),
  JOB_RESEARCH_SOURCE_CONCURRENCY: z.coerce
    .number()
    .int()
    .positive()
    .default(3),
  JOB_RESEARCH_QUERY_CONCURRENCY: z.coerce.number().int().positive().default(4),
  JOB_RESEARCH_CACHE_TTL_HOURS: z.coerce.number().int().positive().default(12),
  JOB_RESEARCH_HTTP_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(30000),
  JOB_RESEARCH_HTTP_RETRIES: z.coerce.number().int().min(0).default(2),
  // Scheduled crawl from verified nationwide native category pages.
  CRAWL_CATEGORY_CRON: z
    .string()
    .default('0 2 * * *')
    .describe('Cron schedule for the periodic category crawl.'),
  CRAWL_CATEGORY_SOURCES: z
    .string()
    .default('topcv,vietnamworks,itviec')
    .describe('Comma-separated sources for the periodic category crawl.'),
  CRAWL_CATEGORY_MAX_JOBS_PER_SOURCE: z.coerce
    .number()
    .int()
    .positive()
    .default(50),
  // Email thông báo kết quả category crawl (Resend). Bỏ trống để tắt.
  RESEND_API_KEY: z
    .string()
    .default('')
    .describe('Resend API key for crawl notifications.'),
  MAIL_FROM: z
    .string()
    .default('Seev Crawler <onboarding@duongle.dev>')
    .describe('Sender address for crawl notification emails.'),
  CRAWL_NOTIFY_EMAIL: z
    .string()
    .default('')
    .describe(
      'Recipient email for crawl notifications; empty disables sending.',
    ),
  CV_RESEARCH_STALE_PROCESSING_MINUTES: z.coerce
    .number()
    .int()
    .positive()
    .default(60),
  CRAWLER_API_URL: z
    .url()
    .default('http://localhost:8000')
    .describe('Base URL of the Python crawler service.'),
  CRAWLER_BEARER_TOKEN: z
    .string()
    .optional()
    .describe('Bearer token sent to the crawler service.'),
  CRAWLER_API_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(180000)
    .describe('Per-request timeout when calling the crawler service.'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>) {
  return envSchema.parse(config);
}
