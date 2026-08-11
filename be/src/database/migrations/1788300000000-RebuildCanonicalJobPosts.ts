import { MigrationInterface, QueryRunner } from 'typeorm';

/** Destructive by design: old job rows cannot satisfy the exact taxonomy/deadline contract. */
export class RebuildCanonicalJobPosts1788300000000 implements MigrationInterface {
  name = 'RebuildCanonicalJobPosts1788300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "job_posts"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_job_posts_category_seniority"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_job_posts_level"`);
    await queryRunner.query(
      `ALTER TABLE "job_posts" DROP COLUMN IF EXISTS "level"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posts" DROP COLUMN IF EXISTS "seniority_text"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posts" DROP COLUMN IF EXISTS "seniority_level_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posts" DROP COLUMN IF EXISTS "seniority_level_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posts" ALTER COLUMN "posted_at" TYPE timestamptz USING "posted_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posts" ALTER COLUMN "expired_at" TYPE timestamptz USING "expired_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posts" ALTER COLUMN "job_category_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posts" ALTER COLUMN "expired_at" SET NOT NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE "job_posts"
      ADD CONSTRAINT "FK_job_posts_category"
      FOREIGN KEY ("job_category_id") REFERENCES "job_categories"("id")
      ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      CREATE TABLE "job_post_seniority_levels" (
        "job_post_id" uuid NOT NULL,
        "seniority_level_id" uuid NOT NULL,
        "mapping_method" character varying NOT NULL,
        "confidence" double precision NOT NULL CHECK ("confidence" >= 0 AND "confidence" <= 1),
        "evidence" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "is_primary" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_job_post_seniority_levels" PRIMARY KEY ("job_post_id", "seniority_level_id"),
        CONSTRAINT "FK_job_post_seniority_job" FOREIGN KEY ("job_post_id") REFERENCES "job_posts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_job_post_seniority_level" FOREIGN KEY ("seniority_level_id") REFERENCES "seniority_levels"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_job_post_seniority_level" ON "job_post_seniority_levels" ("seniority_level_id", "job_post_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_job_post_primary_seniority" ON "job_post_seniority_levels" ("job_post_id") WHERE "is_primary" = true`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_posts_category_expiry" ON "job_posts" ("job_category_id", "expired_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_job_posts_category_expiry"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "job_post_seniority_levels"`);
    await queryRunner.query(
      `ALTER TABLE "job_posts" DROP CONSTRAINT IF EXISTS "FK_job_posts_category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posts" ALTER COLUMN "expired_at" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posts" ALTER COLUMN "job_category_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posts" ALTER COLUMN "posted_at" TYPE timestamp USING "posted_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posts" ALTER COLUMN "expired_at" TYPE timestamp USING "expired_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posts" ADD COLUMN "level" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posts" ADD COLUMN "seniority_text" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posts" ADD COLUMN "seniority_level_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posts" ADD COLUMN "seniority_level_name" character varying`,
    );
  }
}
