import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCrawledJobExperienceYears1786003000000 implements MigrationInterface {
  name = 'AddCrawledJobExperienceYears1786003000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_posts" ADD "experience_min" double precision`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posts" ADD "experience_max" double precision`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_posts_experience_min" ON "job_posts" ("experience_min")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_job_posts_experience_min"`);
    await queryRunner.query(
      `ALTER TABLE "job_posts" DROP COLUMN "experience_max"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posts" DROP COLUMN "experience_min"`,
    );
  }
}
