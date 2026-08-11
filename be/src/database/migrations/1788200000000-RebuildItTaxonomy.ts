import { MigrationInterface, QueryRunner } from 'typeorm';

import { seedItTaxonomy } from '../seeds/it-taxonomy.seed';

export class RebuildItTaxonomy1788200000000 implements MigrationInterface {
  name = 'RebuildItTaxonomy1788200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Derived results depend on the old cross-industry taxonomy. Original CVs
    // and user accounts intentionally remain intact and can be analysed again.
    await queryRunner.query(`DELETE FROM "cv_research_sessions"`);
    await queryRunner.query(`DELETE FROM "cv_audits"`);
    await queryRunner.query(`DELETE FROM "job_intent_matches"`);
    await queryRunner.query(`DELETE FROM "job_crawl_runs"`);
    await queryRunner.query(`DELETE FROM "job_search_intents"`);
    await queryRunner.query(`DELETE FROM "job_posts"`);

    await queryRunner.query(
      `DROP TABLE IF EXISTS "category_seniority_levels" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "seniority_compatibility" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "category_relations" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "source_category_mappings" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "job_category_aliases" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "job_family_category_edges" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "job_family_categories" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "job_categories" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "job_category_groups" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "seniority_levels" CASCADE`);

    for (const table of [
      'cv_audits',
      'cv_research_sessions',
      'job_search_intents',
      'job_posts',
    ]) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "job_category_id" TYPE uuid USING NULL`,
      );
    }

    await queryRunner.query(
      `ALTER TABLE "job_posts" ADD COLUMN IF NOT EXISTS "category_confidence" double precision`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posts" ADD COLUMN IF NOT EXISTS "category_evidence" jsonb NOT NULL DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posts" ADD COLUMN IF NOT EXISTS "source_category_raw" jsonb NOT NULL DEFAULT '{}'::jsonb`,
    );

    await queryRunner.query(`
      CREATE TABLE "job_category_groups" (
        "code" varchar PRIMARY KEY,
        "name" varchar NOT NULL,
        "display_order" int NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "job_categories" (
        "id" uuid PRIMARY KEY,
        "code" varchar NOT NULL UNIQUE,
        "name" varchar NOT NULL,
        "group_code" varchar NOT NULL REFERENCES "job_category_groups"("code") ON DELETE CASCADE,
        "description" text,
        "display_order" int NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "job_category_aliases" (
        "id" bigserial PRIMARY KEY,
        "category_id" uuid NOT NULL REFERENCES "job_categories"("id") ON DELETE CASCADE,
        "alias" varchar NOT NULL,
        "normalized_alias" varchar NOT NULL,
        "alias_type" varchar NOT NULL DEFAULT 'title',
        "weight" double precision NOT NULL DEFAULT 1,
        CONSTRAINT "UQ_job_category_alias" UNIQUE ("category_id", "normalized_alias")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_job_category_alias_normalized" ON "job_category_aliases" ("normalized_alias")`,
    );
    await queryRunner.query(`
      CREATE TABLE "source_category_mappings" (
        "id" bigserial PRIMARY KEY,
        "source" varchar NOT NULL,
        "external_key" varchar NOT NULL,
        "external_name" varchar,
        "category_id" uuid NOT NULL REFERENCES "job_categories"("id") ON DELETE CASCADE,
        "crawl_url" text NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "filter_payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
        CONSTRAINT "UQ_source_category_mapping" UNIQUE ("source", "crawl_url", "category_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "seniority_levels" (
        "id" uuid PRIMARY KEY,
        "code" varchar NOT NULL UNIQUE,
        "track" varchar NOT NULL,
        "name" varchar NOT NULL,
        "display_name" varchar NOT NULL,
        "description" text,
        "display_order" int NOT NULL,
        "rank_in_track" int NOT NULL,
        "experience_min" double precision,
        "experience_max" double precision,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "category_seniority_levels" (
        "category_id" uuid NOT NULL REFERENCES "job_categories"("id") ON DELETE CASCADE,
        "seniority_code" varchar NOT NULL REFERENCES "seniority_levels"("code") ON DELETE CASCADE,
        "is_selectable" boolean NOT NULL DEFAULT true,
        "experience_min_override" double precision,
        "experience_max_override" double precision,
        PRIMARY KEY ("category_id", "seniority_code")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "category_relations" (
        "from_category_id" uuid NOT NULL REFERENCES "job_categories"("id") ON DELETE CASCADE,
        "to_category_id" uuid NOT NULL REFERENCES "job_categories"("id") ON DELETE CASCADE,
        "relation" varchar NOT NULL CHECK ("relation" IN ('exact', 'adjacent', 'unrelated')),
        "score_penalty" int NOT NULL DEFAULT 0,
        PRIMARY KEY ("from_category_id", "to_category_id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "seniority_compatibility" (
        "candidate_code" varchar NOT NULL REFERENCES "seniority_levels"("code") ON DELETE CASCADE,
        "job_code" varchar NOT NULL REFERENCES "seniority_levels"("code") ON DELETE CASCADE,
        "relation" varchar NOT NULL CHECK ("relation" IN ('exact', 'adjacent', 'stretch', 'incompatible')),
        "score_penalty" int NOT NULL DEFAULT 0,
        PRIMARY KEY ("candidate_code", "job_code")
      )
    `);

    await seedItTaxonomy(queryRunner.query.bind(queryRunner));
    await this.addCanonicalForeignKeys(queryRunner);
  }

  public async down(): Promise<void> {
    throw new Error(
      'IT taxonomy rebuild is intentionally irreversible. Restore from a database snapshot if required.',
    );
  }

  private async addCanonicalForeignKeys(queryRunner: QueryRunner) {
    const targets = [
      'cv_audits',
      'cv_research_sessions',
      'job_search_intents',
      'job_posts',
    ];
    for (const table of targets) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD CONSTRAINT "FK_${table}_it_category" FOREIGN KEY ("job_category_id") REFERENCES "job_categories"("id") ON DELETE SET NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD CONSTRAINT "FK_${table}_it_seniority" FOREIGN KEY ("seniority_level_id") REFERENCES "seniority_levels"("id") ON DELETE SET NULL`,
      );
    }
  }
}
