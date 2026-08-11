import { MigrationInterface, QueryRunner } from 'typeorm';

export class CollapseCategoryTreeToTwoLevels1788000000000
  implements MigrationInterface
{
  name = 'CollapseCategoryTreeToTwoLevels1788000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Taxonomy dùng 2 cấp (25 roots + 150 nhóm con): xóa 846 lá (level 3)
    // khỏi job_family_categories + edges. Job gán vào nhóm con (level 2),
    // root chỉ để gom nhóm/lọc.
    await queryRunner.query(
      `DELETE FROM "job_family_category_edges"
       WHERE "parent_id" IN (SELECT "id" FROM "job_family_categories" WHERE "level" >= 3)
          OR "child_id" IN (SELECT "id" FROM "job_family_categories" WHERE "level" >= 3)`,
    );
    await queryRunner.query(
      `DELETE FROM "job_family_categories" WHERE "level" >= 3`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Không thể khôi phục dữ liệu đã xóa — chạy lại
    // `npm run ts-node src/scripts/import-job-family-categories.ts` để import lại từ category.json.
  }
}
