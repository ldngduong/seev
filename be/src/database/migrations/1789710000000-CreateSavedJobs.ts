import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSavedJobs1789710000000 implements MigrationInterface {
  name = 'CreateSavedJobs1789710000000';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "saved_jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "job_post_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_saved_jobs" PRIMARY KEY ("id"), CONSTRAINT "UQ_saved_jobs_user_job" UNIQUE ("user_id", "job_post_id"), CONSTRAINT "FK_saved_jobs_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE, CONSTRAINT "FK_saved_jobs_job" FOREIGN KEY ("job_post_id") REFERENCES "job_posts"("id") ON DELETE CASCADE)`);
    await queryRunner.query(`CREATE INDEX "IDX_saved_jobs_user_created" ON "saved_jobs" ("user_id", "created_at" DESC)`);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "saved_jobs"`);
  }
}