import { MigrationInterface, QueryRunner } from 'typeorm';

export class LinkResearchToUsers1784574000000 implements MigrationInterface {
  name = 'LinkResearchToUsers1784574000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cv_audits" ADD "user_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_search_intents" ADD "user_id" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cv_audits_user_created" ON "cv_audits" ("user_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_search_intents_user_created" ON "job_search_intents" ("user_id", "created_at")`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_audits" ADD CONSTRAINT "FK_cv_audits_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_search_intents" ADD CONSTRAINT "FK_job_search_intents_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_search_intents" DROP CONSTRAINT "FK_job_search_intents_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_audits" DROP CONSTRAINT "FK_cv_audits_user"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_job_search_intents_user_created"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_cv_audits_user_created"`);
    await queryRunner.query(`ALTER TABLE "job_search_intents" DROP COLUMN "user_id"`);
    await queryRunner.query(`ALTER TABLE "cv_audits" DROP COLUMN "user_id"`);
  }
}
