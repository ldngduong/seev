import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResearchSessionLocations1788100000000
  implements MigrationInterface
{
  name = 'AddResearchSessionLocations1788100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cv_research_sessions" ADD COLUMN "locations" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cv_research_sessions" DROP COLUMN "locations"`,
    );
  }
}
