import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCrawledJobDetailFields1786000000000 implements MigrationInterface {
  name = 'AddCrawledJobDetailFields1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "job_posts" ADD "salary_min" bigint`);
    await queryRunner.query(`ALTER TABLE "job_posts" ADD "salary_max" bigint`);
    await queryRunner.query(
      `ALTER TABLE "job_posts" ADD "salary_currency" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posts" ADD "job_type" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posts" ADD "level" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posts" ADD "experience" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "job_posts" ADD "logo" text`);
    await queryRunner.query(
      `CREATE INDEX "IDX_job_posts_level" ON "job_posts" ("level")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_posts_posted_at" ON "job_posts" ("posted_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_job_posts_posted_at"`);
    await queryRunner.query(`DROP INDEX "IDX_job_posts_level"`);
    await queryRunner.query(`ALTER TABLE "job_posts" DROP COLUMN "logo"`);
    await queryRunner.query(`ALTER TABLE "job_posts" DROP COLUMN "experience"`);
    await queryRunner.query(`ALTER TABLE "job_posts" DROP COLUMN "level"`);
    await queryRunner.query(`ALTER TABLE "job_posts" DROP COLUMN "job_type"`);
    await queryRunner.query(
      `ALTER TABLE "job_posts" DROP COLUMN "salary_currency"`,
    );
    await queryRunner.query(`ALTER TABLE "job_posts" DROP COLUMN "salary_max"`);
    await queryRunner.query(`ALTER TABLE "job_posts" DROP COLUMN "salary_min"`);
  }
}
