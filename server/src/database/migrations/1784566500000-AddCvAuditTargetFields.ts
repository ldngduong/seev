import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCvAuditTargetFields1784566500000 implements MigrationInterface {
  name = 'AddCvAuditTargetFields1784566500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cv_audits" ADD "job_category_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_audits" ADD "job_category_name" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_audits" ADD "seniority_level_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_audits" ADD "seniority_level_name" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cv_audits" DROP COLUMN "seniority_level_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_audits" DROP COLUMN "seniority_level_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_audits" DROP COLUMN "job_category_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_audits" DROP COLUMN "job_category_id"`,
    );
  }
}
