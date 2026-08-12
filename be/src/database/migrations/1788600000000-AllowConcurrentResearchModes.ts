import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowConcurrentResearchModes1788600000000 implements MigrationInterface {
  name = 'AllowConcurrentResearchModes1788600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."UQ_cv_research_sessions_active_cv"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_cv_research_sessions_active_cv_mode"
       ON "cv_research_sessions" ("user_id", "user_cv_id", "type")
       WHERE "status" IN ('queued', 'processing')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."UQ_cv_research_sessions_active_cv_mode"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_cv_research_sessions_active_cv"
       ON "cv_research_sessions" ("user_id", "user_cv_id")
       WHERE "status" IN ('queued', 'processing')`,
    );
  }
}
