import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropCrawledJobDetailFields1787001000000
  implements MigrationInterface
{
  name = 'DropCrawledJobDetailFields1787001000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_posts" DROP COLUMN IF EXISTS "description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posts" DROP COLUMN IF EXISTS "requirements"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posts" DROP COLUMN IF EXISTS "benefits"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "job_posts" ADD "description" text`);
    await queryRunner.query(`ALTER TABLE "job_posts" ADD "requirements" text`);
    await queryRunner.query(`ALTER TABLE "job_posts" ADD "benefits" text`);
  }
}
