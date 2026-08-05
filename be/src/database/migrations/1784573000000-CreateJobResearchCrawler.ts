import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJobResearchCrawler1784573000000 implements MigrationInterface {
  name = 'CreateJobResearchCrawler1784573000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "job_search_intents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "audit_id" uuid, "target_role" character varying, "job_category_id" integer, "job_category_name" character varying, "seniority_level_id" uuid, "seniority_level_name" character varying, "status" character varying NOT NULL DEFAULT 'queued', "keywords" jsonb NOT NULL DEFAULT '[]'::jsonb, "locations" jsonb NOT NULL DEFAULT '[]'::jsonb, "requested_sources" jsonb NOT NULL, "completed_sources" jsonb NOT NULL DEFAULT '[]'::jsonb, "total_jobs" integer NOT NULL DEFAULT 0, "max_jobs_per_source" integer NOT NULL, "error" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_job_search_intents" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "job_crawl_runs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "intent_id" uuid NOT NULL, "source" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'queued', "query" jsonb NOT NULL DEFAULT '{}'::jsonb, "fetched_count" integer NOT NULL DEFAULT 0, "saved_count" integer NOT NULL DEFAULT 0, "error" text, "started_at" TIMESTAMP, "completed_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_job_crawl_runs" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "job_posts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "source" character varying NOT NULL, "source_job_id" character varying NOT NULL, "source_url" text NOT NULL, "title" character varying NOT NULL, "company_name" character varying, "salary_text" character varying, "locations" jsonb NOT NULL DEFAULT '[]'::jsonb, "seniority_text" character varying, "job_category_id" integer, "job_category_name" character varying, "seniority_level_id" uuid, "seniority_level_name" character varying, "description" text, "requirements" text, "benefits" text, "skills" jsonb NOT NULL DEFAULT '[]'::jsonb, "search_text" text NOT NULL, "content_hash" character varying NOT NULL, "posted_at" TIMESTAMP, "expired_at" TIMESTAMP, "last_seen_at" TIMESTAMP NOT NULL, "raw" jsonb NOT NULL DEFAULT '{}'::jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_job_posts" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "job_intent_matches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "intent_id" uuid NOT NULL, "job_post_id" uuid NOT NULL, "match_score" integer NOT NULL DEFAULT 0, "matched_terms" jsonb NOT NULL DEFAULT '[]'::jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_job_intent_matches" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_job_posts_source_job_id" ON "job_posts" ("source", "source_job_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_posts_category_seniority" ON "job_posts" ("job_category_id", "seniority_level_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_posts_last_seen_at" ON "job_posts" ("last_seen_at")`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_search_intents" ADD CONSTRAINT "FK_job_search_intents_audit" FOREIGN KEY ("audit_id") REFERENCES "cv_audits"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_crawl_runs" ADD CONSTRAINT "FK_job_crawl_runs_intent" FOREIGN KEY ("intent_id") REFERENCES "job_search_intents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_job_intent_matches_intent_job" ON "job_intent_matches" ("intent_id", "job_post_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_intent_matches_score" ON "job_intent_matches" ("intent_id", "match_score")`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_intent_matches" ADD CONSTRAINT "FK_job_intent_matches_intent" FOREIGN KEY ("intent_id") REFERENCES "job_search_intents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_intent_matches" ADD CONSTRAINT "FK_job_intent_matches_job" FOREIGN KEY ("job_post_id") REFERENCES "job_posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_intent_matches" DROP CONSTRAINT "FK_job_intent_matches_job"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_intent_matches" DROP CONSTRAINT "FK_job_intent_matches_intent"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_job_intent_matches_score"`);
    await queryRunner.query(`DROP INDEX "UQ_job_intent_matches_intent_job"`);
    await queryRunner.query(
      `ALTER TABLE "job_crawl_runs" DROP CONSTRAINT "FK_job_crawl_runs_intent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_search_intents" DROP CONSTRAINT "FK_job_search_intents_audit"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_job_posts_last_seen_at"`);
    await queryRunner.query(`DROP INDEX "IDX_job_posts_category_seniority"`);
    await queryRunner.query(`DROP INDEX "UQ_job_posts_source_job_id"`);
    await queryRunner.query(`DROP TABLE "job_intent_matches"`);
    await queryRunner.query(`DROP TABLE "job_posts"`);
    await queryRunner.query(`DROP TABLE "job_crawl_runs"`);
    await queryRunner.query(`DROP TABLE "job_search_intents"`);
  }
}
