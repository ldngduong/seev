import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { z } from 'zod';

config();

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

const databaseEnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  DATABASE_HOST: z.string().min(1),
  DATABASE_PORT: z.coerce.number().int().positive(),
  DATABASE_USER: z.string().min(1),
  DATABASE_PASSWORD: z.string().min(1),
  DATABASE_NAME: z.string().min(1),
  DATABASE_SSL: envBoolean.default(false),
});

const env = databaseEnvSchema.parse(process.env);
const isCompiled = __filename.endsWith('.js');
const sourceRoot = isCompiled ? 'dist' : 'src';
const extension = isCompiled ? 'js' : 'ts';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: env.DATABASE_HOST,
  port: env.DATABASE_PORT,
  username: env.DATABASE_USER,
  password: env.DATABASE_PASSWORD,
  database: env.DATABASE_NAME,
  ssl: env.DATABASE_SSL,
  synchronize: false,
  entities: [`${sourceRoot}/modules/**/*.entity.${extension}`],
  migrations: [`${sourceRoot}/database/migrations/*.${extension}`],
  migrationsTableName: 'typeorm_migrations',
};

export default new DataSource(dataSourceOptions);
