import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJobMatchKind1787000000000 implements MigrationInterface {
  name = 'AddJobMatchKind1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_intent_matches" ADD "match_kind" character varying(16) NOT NULL DEFAULT 'match'`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_intent_matches" ADD "match_reason" text NOT NULL DEFAULT ''`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_intent_matches" DROP COLUMN "match_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_intent_matches" DROP COLUMN "match_kind"`,
    );
  }
}
