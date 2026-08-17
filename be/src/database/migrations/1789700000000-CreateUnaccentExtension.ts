import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUnaccentExtension1789700000000 implements MigrationInterface {
  name = 'CreateUnaccentExtension1789700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "unaccent"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP EXTENSION IF EXISTS "unaccent"`);
  }
}
