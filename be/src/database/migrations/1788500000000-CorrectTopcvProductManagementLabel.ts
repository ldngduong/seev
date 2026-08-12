import { MigrationInterface, QueryRunner } from 'typeorm';

export class CorrectTopcvProductManagementLabel1788500000000 implements MigrationInterface {
  name = 'CorrectTopcvProductManagementLabel1788500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "source_category_mappings"
       SET "external_name" = $1
       WHERE "source" = 'topcv' AND "external_key" = '321'`,
      ['Product Owner/Product Manager'],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "source_category_mappings"
       SET "external_name" = $1
       WHERE "source" = 'topcv' AND "external_key" = '321'`,
      ['Product Manager/Product Owner'],
    );
  }
}
