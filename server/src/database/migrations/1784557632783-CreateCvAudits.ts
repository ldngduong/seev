import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCvAudits1784557632783 implements MigrationInterface {
  name = 'CreateCvAudits1784557632783';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "cv_audits" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "target_role" character varying, "file_name" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'queued', "extracted_text" text NOT NULL, "total_pages" integer NOT NULL, "overall_score" integer, "feedback" jsonb, "suggested_keywords" jsonb, "suggested_roles" jsonb, "suggested_jobs" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5ba4012abf0404810a0f38185d4" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "cv_audits"`);
  }
}
