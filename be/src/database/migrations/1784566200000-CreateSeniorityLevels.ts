import { MigrationInterface, QueryRunner } from 'typeorm';

const seniorityLevels = [
  {
    code: 'intern',
    name: 'Intern',
    displayName: 'Intern / Thực tập sinh',
    description:
      'Candidate is learning through internship, coursework, and guided project work.',
    displayOrder: 10,
  },
  {
    code: 'fresher',
    name: 'Fresher',
    displayName: 'Fresher / Mới tốt nghiệp',
    description:
      'Candidate has basic practical skills and is ready for entry-level work with guidance.',
    displayOrder: 20,
  },
  {
    code: 'junior',
    name: 'Junior',
    displayName: 'Junior',
    description:
      'Candidate can handle scoped tasks with supervision and has some relevant project or work experience.',
    displayOrder: 30,
  },
  {
    code: 'middle',
    name: 'Middle',
    displayName: 'Middle / Mid-level',
    description:
      'Candidate works independently on normal product tasks and understands production tradeoffs.',
    displayOrder: 40,
  },
  {
    code: 'senior',
    name: 'Senior',
    displayName: 'Senior',
    description:
      'Candidate leads complex implementation, reviews tradeoffs, and mentors less experienced teammates.',
    displayOrder: 50,
  },
  {
    code: 'lead',
    name: 'Team Lead',
    displayName: 'Team Lead / Truong nhom',
    description:
      'Candidate leads a small team, plans delivery, and owns technical quality across a feature area.',
    displayOrder: 60,
  },
  {
    code: 'manager',
    name: 'Manager',
    displayName: 'Manager / Quan ly',
    description:
      'Candidate manages people, delivery, priorities, and stakeholder coordination.',
    displayOrder: 70,
  },
  {
    code: 'director',
    name: 'Director',
    displayName: 'Director / Giam doc',
    description:
      'Candidate owns department-level strategy, hiring direction, and business-aligned execution.',
    displayOrder: 80,
  },
];

export class CreateSeniorityLevels1784566200000 implements MigrationInterface {
  name = 'CreateSeniorityLevels1784566200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "seniority_levels" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying NOT NULL, "name" character varying NOT NULL, "display_name" character varying NOT NULL, "description" text, "display_order" integer NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_seniority_levels_code" UNIQUE ("code"), CONSTRAINT "PK_seniority_levels" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_seniority_levels_active_order" ON "seniority_levels" ("is_active", "display_order")`,
    );

    for (const level of seniorityLevels) {
      await queryRunner.query(
        `INSERT INTO "seniority_levels" ("code", "name", "display_name", "description", "display_order") VALUES ($1, $2, $3, $4, $5)`,
        [
          level.code,
          level.name,
          level.displayName,
          level.description,
          level.displayOrder,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_seniority_levels_active_order"`);
    await queryRunner.query(`DROP TABLE "seniority_levels"`);
  }
}
