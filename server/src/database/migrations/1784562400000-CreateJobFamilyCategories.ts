import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJobFamilyCategories1784562400000 implements MigrationInterface {
  name = 'CreateJobFamilyCategories1784562400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "job_family_categories" ("id" integer NOT NULL, "name" character varying NOT NULL, "level" smallint NOT NULL, "alias" character varying NOT NULL, "display_order" integer NOT NULL, "search_text" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_job_family_categories_alias" UNIQUE ("alias"), CONSTRAINT "PK_job_family_categories" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_family_categories_level" ON "job_family_categories" ("level")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_family_categories_name" ON "job_family_categories" ("name")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_family_categories_search_text" ON "job_family_categories" ("search_text")`,
    );
    await queryRunner.query(
      `CREATE TABLE "job_family_category_edges" ("parent_id" integer NOT NULL, "child_id" integer NOT NULL, "position" integer NOT NULL, CONSTRAINT "PK_job_family_category_edges" PRIMARY KEY ("parent_id", "child_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_family_category_edges_parent" ON "job_family_category_edges" ("parent_id", "position")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_family_category_edges_child" ON "job_family_category_edges" ("child_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_family_category_edges" ADD CONSTRAINT "FK_job_family_category_edges_parent" FOREIGN KEY ("parent_id") REFERENCES "job_family_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_family_category_edges" ADD CONSTRAINT "FK_job_family_category_edges_child" FOREIGN KEY ("child_id") REFERENCES "job_family_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_family_category_edges" DROP CONSTRAINT "FK_job_family_category_edges_child"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_family_category_edges" DROP CONSTRAINT "FK_job_family_category_edges_parent"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_job_family_category_edges_child"`);
    await queryRunner.query(
      `DROP INDEX "IDX_job_family_category_edges_parent"`,
    );
    await queryRunner.query(`DROP TABLE "job_family_category_edges"`);
    await queryRunner.query(
      `DROP INDEX "IDX_job_family_categories_search_text"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_job_family_categories_name"`);
    await queryRunner.query(`DROP INDEX "IDX_job_family_categories_level"`);
    await queryRunner.query(`DROP TABLE "job_family_categories"`);
  }
}
