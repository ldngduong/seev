import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeleteDroppedSourceJobs1788003000000
  implements MigrationInterface
{
  name = 'DeleteDroppedSourceJobs1788003000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Bỏ job của các source đã gỡ khỏi crawler (jobsgo, indeed, topdev,
    // careerviet, viecoi): research giờ đọc từ DB nên data của source chết
    // không được hiển thị. job_intent_matches tự xóa theo FK ON DELETE CASCADE.
    await queryRunner.query(
      `DELETE FROM "job_posts" WHERE "source" IN ('jobsgo', 'indeed', 'topdev', 'careerviet', 'viecoi')`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Data đã xóa không khôi phục được.
  }
}
