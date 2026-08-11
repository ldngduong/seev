import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixSeniorityDisplayNames1788001000000
  implements MigrationInterface
{
  name = 'FixSeniorityDisplayNames1788001000000';

  // Tên cấp bậc tối ưu tiếng Việt: thuật ngữ IT quen thuộc giữ nguyên
  // tiếng Anh (Junior/Middle/Senior), còn lại dịch tiếng Việt chuẩn.
  private readonly displayNames: Record<string, string> = {
    intern: 'Intern / Thực tập sinh',
    fresher: 'Fresher / Mới tốt nghiệp',
    junior: 'Junior',
    middle: 'Middle',
    senior: 'Senior',
    lead: 'Team Lead / Trưởng nhóm',
    manager: 'Manager / Quản lý',
    director: 'Director / Giám đốc',
  };

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [code, displayName] of Object.entries(this.displayNames)) {
      await queryRunner.query(
        `UPDATE "seniority_levels" SET "display_name" = $1 WHERE "code" = $2`,
        [displayName, code],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Không khôi phục — tên cũ thiếu dấu tiếng Việt ("Truong nhom"...).
  }
}
