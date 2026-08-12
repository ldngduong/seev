import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Application timestamps are absolute instants. Older migrations created them
 * as `timestamp without time zone` while PostgreSQL stored UTC wall-clock
 * values. node-postgres then interpreted those values in the process timezone,
 * causing a seven-hour offset in UTC+7 environments.
 */
export class NormalizeApplicationTimestamps1789100000000
  implements MigrationInterface
{
  name = 'NormalizeApplicationTimestamps1789100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $migration$
      DECLARE
        target record;
      BEGIN
        FOR target IN
          SELECT table_schema, table_name, column_name
            FROM information_schema.columns
           WHERE table_schema = 'public'
             AND data_type = 'timestamp without time zone'
        LOOP
          EXECUTE format(
            'ALTER TABLE %I.%I ALTER COLUMN %I TYPE timestamptz USING %I AT TIME ZONE ''UTC''',
            target.table_schema,
            target.table_name,
            target.column_name,
            target.column_name
          );
        END LOOP;
      END
      $migration$;
    `);
  }

  public async down(): Promise<void> {
    // Absolute instants must not be downgraded to timezone-less wall-clock data.
  }
}
