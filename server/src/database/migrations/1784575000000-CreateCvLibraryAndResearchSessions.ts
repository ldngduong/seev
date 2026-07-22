import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCvLibraryAndResearchSessions1784575000000
  implements MigrationInterface
{
  name = 'CreateCvLibraryAndResearchSessions1784575000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_cvs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "name" character varying NOT NULL, "original_file_name" character varying NOT NULL, "mime_type" character varying NOT NULL, "size_bytes" integer NOT NULL, "content_hash" character varying NOT NULL, "storage_provider" character varying NOT NULL, "storage_bucket" character varying NOT NULL, "storage_key" text NOT NULL, "storage_etag" character varying, "status" character varying NOT NULL DEFAULT 'ready', "extracted_text" text NOT NULL, "parsed_lines" jsonb NOT NULL DEFAULT '[]'::jsonb, "total_pages" integer NOT NULL, "error" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_user_cvs" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_cvs_user_created" ON "user_cvs" ("user_id", "created_at")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_cvs" ADD CONSTRAINT "FK_user_cvs_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "cv_audits" ADD "user_cv_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_audits" ADD "research_session_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_audits" ADD "research_type" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_search_intents" ADD "research_session_id" uuid`,
    );

    await queryRunner.query(
      `CREATE TABLE "cv_research_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "user_cv_id" uuid NOT NULL, "cv_audit_id" uuid, "job_search_intent_id" uuid, "type" character varying NOT NULL, "target_source" character varying NOT NULL, "target_role" character varying, "job_category_id" integer, "job_category_name" character varying, "seniority_level_id" uuid, "seniority_level_name" character varying, "job_description" text, "status" character varying NOT NULL DEFAULT 'processing', "audit_snapshot" jsonb, "job_suggestions_snapshot" jsonb NOT NULL DEFAULT '[]'::jsonb, "error" text, "completed_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_cv_research_sessions" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cv_research_sessions_user_created" ON "cv_research_sessions" ("user_id", "created_at")`,
    );

    await queryRunner.query(
      `ALTER TABLE "cv_audits" ADD CONSTRAINT "FK_cv_audits_user_cv" FOREIGN KEY ("user_cv_id") REFERENCES "user_cvs"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_research_sessions" ADD CONSTRAINT "FK_cv_research_sessions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_research_sessions" ADD CONSTRAINT "FK_cv_research_sessions_user_cv" FOREIGN KEY ("user_cv_id") REFERENCES "user_cvs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_research_sessions" ADD CONSTRAINT "FK_cv_research_sessions_cv_audit" FOREIGN KEY ("cv_audit_id") REFERENCES "cv_audits"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_research_sessions" ADD CONSTRAINT "FK_cv_research_sessions_job_intent" FOREIGN KEY ("job_search_intent_id") REFERENCES "job_search_intents"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_research_sessions" ADD CONSTRAINT "FK_cv_research_sessions_category" FOREIGN KEY ("job_category_id") REFERENCES "job_family_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_research_sessions" ADD CONSTRAINT "FK_cv_research_sessions_seniority" FOREIGN KEY ("seniority_level_id") REFERENCES "seniority_levels"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cv_research_sessions" DROP CONSTRAINT "FK_cv_research_sessions_seniority"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_research_sessions" DROP CONSTRAINT "FK_cv_research_sessions_category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_research_sessions" DROP CONSTRAINT "FK_cv_research_sessions_job_intent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_research_sessions" DROP CONSTRAINT "FK_cv_research_sessions_cv_audit"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_research_sessions" DROP CONSTRAINT "FK_cv_research_sessions_user_cv"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_research_sessions" DROP CONSTRAINT "FK_cv_research_sessions_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_audits" DROP CONSTRAINT "FK_cv_audits_user_cv"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_cv_research_sessions_user_created"`);
    await queryRunner.query(`DROP TABLE "cv_research_sessions"`);
    await queryRunner.query(
      `ALTER TABLE "job_search_intents" DROP COLUMN "research_session_id"`,
    );
    await queryRunner.query(`ALTER TABLE "cv_audits" DROP COLUMN "research_type"`);
    await queryRunner.query(
      `ALTER TABLE "cv_audits" DROP COLUMN "research_session_id"`,
    );
    await queryRunner.query(`ALTER TABLE "cv_audits" DROP COLUMN "user_cv_id"`);
    await queryRunner.query(`ALTER TABLE "user_cvs" DROP CONSTRAINT "FK_user_cvs_user"`);
    await queryRunner.query(`DROP INDEX "IDX_user_cvs_user_created"`);
    await queryRunner.query(`DROP TABLE "user_cvs"`);
  }
}
