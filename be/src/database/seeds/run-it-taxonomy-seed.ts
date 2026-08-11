import dataSource from '../data-source';
import {
  categories,
  categoryGroups,
  seedItTaxonomy,
  seniorityLevels,
} from './it-taxonomy.seed';

async function main() {
  await dataSource.initialize();
  try {
    await dataSource.transaction((manager) =>
      seedItTaxonomy(manager.query.bind(manager)),
    );
    const [counts] = (await dataSource.query(`
      SELECT
        (SELECT count(*)::int FROM job_category_groups) AS groups,
        (SELECT count(*)::int FROM job_categories) AS categories,
        (SELECT count(*)::int FROM job_category_aliases) AS aliases,
        (SELECT count(*)::int FROM seniority_levels) AS seniorities,
        (SELECT count(*)::int FROM category_seniority_levels) AS category_seniority_rules,
        (SELECT count(*)::int FROM category_relations) AS category_relations,
        (SELECT count(*)::int FROM seniority_compatibility) AS seniority_relations
    `)) as Array<Record<string, number>>;
    const expected = {
      groups: categoryGroups.length,
      categories: categories.length,
      seniorities: seniorityLevels.length,
      category_relations: categories.length ** 2,
      seniority_relations: seniorityLevels.length ** 2,
    };
    for (const [key, value] of Object.entries(expected)) {
      if (counts[key] !== value) {
        throw new Error(
          `Seed không đầy đủ: ${key}=${counts[key]}, mong đợi ${value}`,
        );
      }
    }
    console.log(
      `Đã seed và xác minh taxonomy CNTT: ${JSON.stringify(counts)}.`,
    );
  } finally {
    await dataSource.destroy();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
