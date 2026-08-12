import { MigrationInterface, QueryRunner } from 'typeorm';

export class PreserveJobFitHistory1789200000000 implements MigrationInterface {
  name = 'PreserveJobFitHistory1789200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "job_fit_analyses" DROP CONSTRAINT "FK_job_fit_job"`);
    await queryRunner.query(`ALTER TABLE "job_fit_analyses" ALTER COLUMN "job_post_id" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "job_fit_analyses" ADD CONSTRAINT "FK_job_fit_job" FOREIGN KEY ("job_post_id") REFERENCES "job_posts"("id") ON DELETE SET NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "job_fit_analyses" WHERE "job_post_id" IS NULL`);
    await queryRunner.query(`ALTER TABLE "job_fit_analyses" DROP CONSTRAINT "FK_job_fit_job"`);
    await queryRunner.query(`ALTER TABLE "job_fit_analyses" ALTER COLUMN "job_post_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "job_fit_analyses" ADD CONSTRAINT "FK_job_fit_job" FOREIGN KEY ("job_post_id") REFERENCES "job_posts"("id") ON DELETE CASCADE`);
  }
}
