import { MigrationInterface, QueryRunner } from 'typeorm';

export class CorrectItviecNativeCategoryMappings1788400000000
  implements MigrationInterface
{
  name = 'CorrectItviecNativeCategoryMappings1788400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "source_category_mappings"
       SET "external_key" = $1, "external_name" = $2, "crawl_url" = $3
       WHERE "source" = 'itviec' AND "category_id" = $4`,
      [
        'ai-machine-learning-engineer',
        'AI / Machine Learning Engineer',
        'https://itviec.com/it-jobs/ai-machine-learning-engineer',
        '10000000-0000-4000-8000-000000001204',
      ],
    );
    await queryRunner.query(
      `UPDATE "source_category_mappings"
       SET "external_name" = $1
       WHERE "source" = 'itviec' AND "category_id" = $2`,
      [
        'Systems Engineer / Administrator',
        '10000000-0000-4000-8000-000000001302',
      ],
    );
    await queryRunner.query(
      `UPDATE "source_category_mappings"
       SET "external_key" = $1, "external_name" = $2, "crawl_url" = $3
       WHERE "source" = 'itviec' AND "category_id" = $4`,
      [
        'product-designer',
        'Product Designer',
        'https://itviec.com/it-jobs/product-designer',
        '10000000-0000-4000-8000-000000001701',
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "source_category_mappings"
       SET "external_key" = $1, "external_name" = $2, "crawl_url" = $3
       WHERE "source" = 'itviec' AND "category_id" = $4`,
      [
        'ai-ml-engineer',
        'AI/ML Engineer',
        'https://itviec.com/it-jobs/ai-ml-engineer',
        '10000000-0000-4000-8000-000000001204',
      ],
    );
    await queryRunner.query(
      `UPDATE "source_category_mappings"
       SET "external_name" = $1
       WHERE "source" = 'itviec' AND "category_id" = $2`,
      [
        'Systems Engineer/Administrator',
        '10000000-0000-4000-8000-000000001302',
      ],
    );
    await queryRunner.query(
      `UPDATE "source_category_mappings"
       SET "external_key" = $1, "external_name" = $2, "crawl_url" = $3
       WHERE "source" = 'itviec' AND "category_id" = $4`,
      [
        'ui-ux-designer',
        'UI/UX Designer',
        'https://itviec.com/it-jobs/ui-ux-designer',
        '10000000-0000-4000-8000-000000001701',
      ],
    );
  }
}
