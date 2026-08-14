import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJobSuggestionRetryService1789600000000 implements MigrationInterface {
  name = 'AddJobSuggestionRetryService1789600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "service_products" ("id", "code", "name", "description", "price_credits")
      VALUES (
        '20000000-0000-4000-8000-000000000006',
        'job_suggestion_retry',
        'Thử lại gợi ý việc làm',
        'Chạy lại bước tìm và đối chiếu việc làm cho một research đã có kết quả đánh giá CV.',
        2
      )
      ON CONFLICT ("code") DO UPDATE SET
        "name" = EXCLUDED."name",
        "description" = EXCLUDED."description",
        "is_active" = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "service_products" WHERE "code" = 'job_suggestion_retry'`);
  }
}
