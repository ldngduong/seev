import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsers1784570000000 implements MigrationInterface {
  name = 'CreateUsers1784570000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "full_name" character varying NOT NULL, "username" character varying, "email" character varying NOT NULL, "password" character varying, "phone" character varying, "credits" integer NOT NULL DEFAULT 0, "address" text, "date_of_birth" date, "gender" character varying, "avatar" text, "bio" text, "google_id" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_users_username" UNIQUE ("username"), CONSTRAINT "UQ_users_email" UNIQUE ("email"), CONSTRAINT "UQ_users_google_id" UNIQUE ("google_id"), CONSTRAINT "PK_users" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
