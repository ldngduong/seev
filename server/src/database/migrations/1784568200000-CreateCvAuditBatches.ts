import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCvAuditBatches1784568200000
  implements MigrationInterface
{
  name = 'CreateCvAuditBatches1784568200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "cv_audit_batches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "audit_id" uuid NOT NULL, "batch_index" integer NOT NULL, "total_batches" integer NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "source_line_ids" jsonb NOT NULL, "result" jsonb, "error" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_cv_audit_batches_audit_batch" UNIQUE ("audit_id", "batch_index"), CONSTRAINT "PK_cv_audit_batches" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_audit_batches" ADD CONSTRAINT "FK_cv_audit_batches_audit" FOREIGN KEY ("audit_id") REFERENCES "cv_audits"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cv_audit_batches" DROP CONSTRAINT "FK_cv_audit_batches_audit"`,
    );
    await queryRunner.query(`DROP TABLE "cv_audit_batches"`);
  }
}
