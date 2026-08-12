import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSystemSettings1789500000000 implements MigrationInterface {
  name = 'CreateSystemSettings1789500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "system_settings" ("key" character varying(100) NOT NULL, "value" jsonb NOT NULL, "updated_by_user_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_system_settings" PRIMARY KEY ("key"), CONSTRAINT "FK_system_settings_updated_by" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL)`);
    await queryRunner.query(`INSERT INTO "system_settings" ("key", "value") VALUES ('new_account_credits', '{"enabled":false,"credits":0}'::jsonb)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "system_settings"`);
  }
}
