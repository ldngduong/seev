import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationOccurredAt1789000000000 implements MigrationInterface {
  name = 'AddNotificationOccurredAt1789000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_notifications" ADD "occurred_at" timestamptz`,
    );
    await queryRunner.query(
      `UPDATE "user_notifications" SET "occurred_at" = "updated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_notifications" ALTER COLUMN "occurred_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_notifications" ALTER COLUMN "occurred_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_notifications_user_occurred" ON "user_notifications" ("user_id", "occurred_at" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_user_notifications_user_occurred"`);
    await queryRunner.query(
      `ALTER TABLE "user_notifications" DROP COLUMN "occurred_at"`,
    );
  }
}
