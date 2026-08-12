import { MigrationInterface, QueryRunner } from 'typeorm';

export class CleanTopcvTooltipSkills1788900000000 implements MigrationInterface {
  name = 'CleanTopcvTooltipSkills1788900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH cleaned AS (
        SELECT job.id,
               COALESCE(
                 jsonb_agg(skill.value ORDER BY skill.ordinality)
                   FILTER (WHERE skill.value IS NOT NULL),
                 '[]'::jsonb
               ) AS skills
          FROM job_posts job
          LEFT JOIN LATERAL jsonb_array_elements_text(job.skills)
            WITH ORDINALITY AS skill(value, ordinality)
            ON length(trim(skill.value)) BETWEEN 1 AND 60
           AND array_length(regexp_split_to_array(trim(skill.value), '\\s+'), 1) <= 8
           AND skill.value !~* '<[/]?[a-z][^>]*>|&(lt|gt|nbsp|amp);'
           AND skill.value !~* 'nhà tuyển dụng|đã xác thực|giấy phép kinh doanh|tài khoản ntd|địa điểm làm việc|danh mục hành chính|hãy đăng nhập'
         WHERE job.source = 'topcv'
         GROUP BY job.id
      )
      UPDATE job_posts job
         SET skills = cleaned.skills,
             raw = jsonb_set(job.raw, '{source_tags}', cleaned.skills, true)
        FROM cleaned
       WHERE job.id = cleaned.id
    `);
  }

  public async down(): Promise<void> {
    // Removed source-page chrome is intentionally not recoverable.
  }
}
