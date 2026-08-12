import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJobDetailsAndJobFit1788800000000 implements MigrationInterface {
  name = 'AddJobDetailsAndJobFit1788800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "job_post_details" ("job_post_id" uuid NOT NULL, "description" text NOT NULL, "requirements" text NOT NULL, "content_hash" character varying(32) NOT NULL, "source_evidence" jsonb NOT NULL DEFAULT '{}', "parser_version" integer NOT NULL, "quality_score" double precision NOT NULL, "fetched_at" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "CHK_job_post_details_content" CHECK (length(trim("description")) >= 40 AND length(trim("requirements")) >= 40), CONSTRAINT "CHK_job_post_details_quality" CHECK ("quality_score" BETWEEN 0 AND 1), CONSTRAINT "PK_job_post_details" PRIMARY KEY ("job_post_id"), CONSTRAINT "FK_job_post_details_job" FOREIGN KEY ("job_post_id") REFERENCES "job_posts"("id") ON DELETE CASCADE)`);
    await queryRunner.query(`CREATE TABLE "job_fit_analyses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "user_cv_id" uuid NOT NULL, "job_post_id" uuid NOT NULL, "cv_content_hash" character varying NOT NULL, "job_detail_hash" character varying NOT NULL, "scoring_version" integer NOT NULL DEFAULT 1, "status" character varying NOT NULL DEFAULT 'queued', "phase" character varying NOT NULL DEFAULT 'queued', "progress" smallint NOT NULL DEFAULT 0, "progress_message" character varying, "attempt" integer NOT NULL DEFAULT 1, "score" smallint, "verdict" character varying, "confidence" double precision, "result" jsonb, "job_snapshot" jsonb NOT NULL, "error" text, "started_at" TIMESTAMP, "completed_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "CHK_job_fit_progress" CHECK ("progress" BETWEEN 0 AND 100), CONSTRAINT "CHK_job_fit_score" CHECK ("score" IS NULL OR "score" BETWEEN 0 AND 100), CONSTRAINT "CHK_job_fit_status" CHECK ("status" IN ('queued','processing','completed','failed')), CONSTRAINT "PK_job_fit_analyses" PRIMARY KEY ("id"), CONSTRAINT "FK_job_fit_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE, CONSTRAINT "FK_job_fit_cv" FOREIGN KEY ("user_cv_id") REFERENCES "user_cvs"("id") ON DELETE CASCADE, CONSTRAINT "FK_job_fit_job" FOREIGN KEY ("job_post_id") REFERENCES "job_posts"("id") ON DELETE CASCADE)`);
    await queryRunner.query(`CREATE INDEX "IDX_job_fit_user_created" ON "job_fit_analyses" ("user_id", "created_at" DESC)`);
    await queryRunner.query(`CREATE INDEX "IDX_job_fit_cache" ON "job_fit_analyses" ("user_cv_id", "job_post_id", "cv_content_hash", "job_detail_hash", "scoring_version")`);

    await queryRunner.query(`ALTER TABLE "service_usages" ADD "subject_type" character varying`);
    await queryRunner.query(`ALTER TABLE "service_usages" ADD "subject_id" uuid`);
    await queryRunner.query(`UPDATE "service_usages" SET "subject_type" = 'cv_research', "subject_id" = "research_session_id"`);
    await queryRunner.query(`ALTER TABLE "service_usages" ALTER COLUMN "subject_type" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "service_usages" ALTER COLUMN "subject_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "service_usages" DROP CONSTRAINT "FK_service_usages_session"`);
    await queryRunner.query(`ALTER TABLE "service_usages" DROP CONSTRAINT "UQ_service_usages_session_attempt"`);
    await queryRunner.query(`ALTER TABLE "service_usages" DROP COLUMN "research_session_id"`);
    await queryRunner.query(`ALTER TABLE "service_usages" ADD CONSTRAINT "UQ_service_usages_subject_attempt" UNIQUE ("subject_type", "subject_id", "attempt")`);

    await queryRunner.query(`ALTER TABLE "credit_transactions" ADD "subject_type" character varying`);
    await queryRunner.query(`ALTER TABLE "credit_transactions" ADD "subject_id" uuid`);
    await queryRunner.query(`UPDATE "credit_transactions" SET "subject_type" = 'cv_research', "subject_id" = "research_session_id" WHERE "research_session_id" IS NOT NULL`);
    await queryRunner.query(`ALTER TABLE "credit_transactions" DROP CONSTRAINT "FK_credit_transactions_session"`);
    await queryRunner.query(`ALTER TABLE "credit_transactions" DROP COLUMN "research_session_id"`);
    await queryRunner.query(`INSERT INTO "service_products" ("id", "code", "name", "description", "price_credits") VALUES ('20000000-0000-4000-8000-000000000003', 'job_fit_analysis', 'Đánh giá độ phù hợp việc làm', 'Phân tích mức độ phù hợp giữa một CV đã lưu và một việc làm cụ thể.', 3) ON CONFLICT ("code") DO UPDATE SET "name"=EXCLUDED."name", "description"=EXCLUDED."description", "is_active"=true`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "service_products" WHERE "code" = 'job_fit_analysis'`);
    await queryRunner.query(`ALTER TABLE "credit_transactions" ADD "research_session_id" uuid`);
    await queryRunner.query(`UPDATE "credit_transactions" SET "research_session_id" = "subject_id" WHERE "subject_type" = 'cv_research'`);
    await queryRunner.query(`ALTER TABLE "credit_transactions" DROP COLUMN "subject_id"`);
    await queryRunner.query(`ALTER TABLE "credit_transactions" DROP COLUMN "subject_type"`);
    await queryRunner.query(`ALTER TABLE "service_usages" ADD "research_session_id" uuid`);
    await queryRunner.query(`UPDATE "service_usages" SET "research_session_id" = "subject_id" WHERE "subject_type" = 'cv_research'`);
    await queryRunner.query(`DELETE FROM "service_usages" WHERE "research_session_id" IS NULL`);
    await queryRunner.query(`ALTER TABLE "service_usages" ALTER COLUMN "research_session_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "service_usages" DROP CONSTRAINT "UQ_service_usages_subject_attempt"`);
    await queryRunner.query(`ALTER TABLE "service_usages" ADD CONSTRAINT "UQ_service_usages_session_attempt" UNIQUE ("research_session_id", "attempt")`);
    await queryRunner.query(`ALTER TABLE "service_usages" DROP COLUMN "subject_id"`);
    await queryRunner.query(`ALTER TABLE "service_usages" DROP COLUMN "subject_type"`);
    await queryRunner.query(`DROP TABLE "job_fit_analyses"`);
    await queryRunner.query(`DROP TABLE "job_post_details"`);
  }
}
