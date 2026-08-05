import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJobSearchQueries1784576000000 implements MigrationInterface {
  name = 'AddJobSearchQueries1784576000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_search_intents" ADD "search_queries" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_search_intents" DROP COLUMN "search_queries"`,
    );
  }
}
