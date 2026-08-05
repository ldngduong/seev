import { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

import type { Env } from './env.schema';

export function createTypeOrmOptions(
  config: ConfigService<Env, true>,
): TypeOrmModuleOptions {
  const nodeEnv = config.get('NODE_ENV', { infer: true });
  const synchronize = config.get('TYPEORM_SYNC', { infer: true });
  const ssl = config.get('DATABASE_SSL', { infer: true });

  return {
    type: 'postgres',
    host: config.get('DATABASE_HOST', { infer: true }),
    port: config.get('DATABASE_PORT', { infer: true }),
    username: config.get('DATABASE_USER', { infer: true }),
    password: config.get('DATABASE_PASSWORD', { infer: true }),
    database: config.get('DATABASE_NAME', { infer: true }),
    ssl,
    autoLoadEntities: true,
    migrationsTableName: 'typeorm_migrations',
    synchronize: nodeEnv !== 'production' && synchronize,
  };
}
