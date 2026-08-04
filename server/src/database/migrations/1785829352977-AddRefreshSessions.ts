import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshSessions1785829352977 implements MigrationInterface {
  name = 'AddRefreshSessions1785829352977';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "refresh_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "family_id" uuid NOT NULL, "token_hash" character(64) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, "replaced_by_session_id" uuid, "last_used_at" TIMESTAMP WITH TIME ZONE, "ip_address" character varying(64), "user_agent" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_refresh_sessions" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_sessions_user_id" ON "refresh_sessions" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_sessions_family_id" ON "refresh_sessions" ("family_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_sessions" ADD CONSTRAINT "FK_refresh_sessions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "job_search_intents" ADD "research_session_attempt" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_research_sessions" ADD "phase" character varying NOT NULL DEFAULT 'queued'`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_research_sessions" ADD "progress" smallint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_research_sessions" ADD "progress_message" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_research_sessions" ADD "attempt" integer NOT NULL DEFAULT 1`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_research_sessions" ADD "started_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_research_sessions" ADD "heartbeat_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_research_sessions" ALTER COLUMN "status" SET DEFAULT 'queued'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_cv_research_sessions_active_cv" ON "cv_research_sessions" ("user_id", "user_cv_id") WHERE "status" IN ('queued', 'processing')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_cv_research_sessions_active_cv"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_research_sessions" ALTER COLUMN "status" SET DEFAULT 'processing'`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_research_sessions" DROP COLUMN "heartbeat_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_research_sessions" DROP COLUMN "started_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_research_sessions" DROP COLUMN "attempt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_research_sessions" DROP COLUMN "progress_message"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_research_sessions" DROP COLUMN "progress"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_research_sessions" DROP COLUMN "phase"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_search_intents" DROP COLUMN "research_session_attempt"`,
    );

    await queryRunner.query(
      `ALTER TABLE "refresh_sessions" DROP CONSTRAINT "FK_refresh_sessions_user"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_refresh_sessions_family_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_refresh_sessions_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "refresh_sessions"`);
  }
}
