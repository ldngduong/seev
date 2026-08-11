import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJobPostDedupKey1788002000000 implements MigrationInterface {
  name = 'AddJobPostDedupKey1788002000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Chống trùng job theo (source, source_url + title) ngoài source_job_id:
    // job đăng lại / trùng title+url không tạo row mới.
    await queryRunner.query(
      `ALTER TABLE "job_posts" ADD COLUMN "dedup_key" character varying(32)`,
    );
    await queryRunner.query(
      `UPDATE "job_posts" SET "dedup_key" = md5("source_url" || '|' || "title") WHERE "dedup_key" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posts" ALTER COLUMN "dedup_key" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_job_posts_source_dedup_key" ON "job_posts" ("source", "dedup_key")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "UQ_job_posts_source_dedup_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posts" DROP COLUMN "dedup_key"`,
    );
  }
}
