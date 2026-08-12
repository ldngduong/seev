import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnableUuidExtension1784000000000 implements MigrationInterface {
  name = 'EnableUuidExtension1784000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  }

  public async down(): Promise<void> {
    // Other tables use uuid_generate_v4(), so the shared extension is retained.
  }
}
