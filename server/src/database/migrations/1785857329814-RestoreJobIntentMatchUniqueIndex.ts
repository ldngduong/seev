import { MigrationInterface, QueryRunner } from 'typeorm';

export class RestoreJobIntentMatchUniqueIndex1785857329814 implements MigrationInterface {
  name = 'RestoreJobIntentMatchUniqueIndex1785857329814';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_job_intent_matches_intent_job" ON "job_intent_matches" ("intent_id", "job_post_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_job_intent_matches_intent_job"`,
    );
  }
}
