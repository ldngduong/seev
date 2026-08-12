import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExternalJobResearchFailureOrigin1789400000000 implements MigrationInterface {
  name = 'AddExternalJobResearchFailureOrigin1789400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "external_job_researches" ADD COLUMN "failure_origin" character varying`);
    await queryRunner.query(`ALTER TABLE "external_job_researches" ADD CONSTRAINT "CHK_external_job_research_failure_origin" CHECK ("failure_origin" IS NULL OR "failure_origin" IN ('user_input','system'))`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "external_job_researches" DROP CONSTRAINT "CHK_external_job_research_failure_origin"`);
    await queryRunner.query(`ALTER TABLE "external_job_researches" DROP COLUMN "failure_origin"`);
  }
}
