import fs from 'node:fs';
import path from 'node:path';

import { z } from 'zod';

import dataSource from '../database/data-source';

const categorySchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  level: z.number().int().positive(),
  children_ids: z.array(z.number().int().positive()),
  alias: z.string().min(1),
});

const payloadSchema = z.object({
  data: z.object({
    list_categories: z.array(categorySchema),
  }),
});

type CategoryInput = z.infer<typeof categorySchema>;

async function main() {
  const filePath = path.resolve(
    process.cwd(),
    process.argv[2] ?? '../category.json',
  );
  const payload = payloadSchema.parse(
    JSON.parse(fs.readFileSync(filePath, 'utf8')),
  );
  const categories = payload.data.list_categories;
  const categoryIds = new Set(categories.map((category) => category.id));
  const missingChildIds = categories.flatMap((category) =>
    category.children_ids
      .filter((childId) => !categoryIds.has(childId))
      .map((childId) => ({ parentId: category.id, childId })),
  );

  if (missingChildIds.length > 0) {
    throw new Error(
      `category.json has ${missingChildIds.length} child ids without category records.`,
    );
  }

  await dataSource.initialize();

  try {
    await dataSource.transaction(async (manager) => {
      await manager.query(`DELETE FROM "job_family_category_edges"`);
      await upsertCategories(manager.query.bind(manager), categories);
      await manager.query(
        `DELETE FROM "job_family_categories" WHERE "id" <> ALL($1::int[])`,
        [categories.map((category) => category.id)],
      );
      await insertEdges(manager.query.bind(manager), categories);
    });

    const rootCount = await dataSource.query(
      `SELECT COUNT(*)::int AS "count" FROM "job_family_categories" c WHERE NOT EXISTS (SELECT 1 FROM "job_family_category_edges" e WHERE e."child_id" = c."id")`,
    );
    const edgeCount = await dataSource.query(
      `SELECT COUNT(*)::int AS "count" FROM "job_family_category_edges"`,
    );

    console.log(
      `Imported ${categories.length} categories, ${edgeCount[0].count} parent-child edges, ${rootCount[0].count} root categories.`,
    );
  } finally {
    await dataSource.destroy();
  }
}

async function upsertCategories(
  query: (sql: string, params?: unknown[]) => Promise<unknown>,
  categories: CategoryInput[],
) {
  const params: unknown[] = [];
  const values = categories.map((category, index) => {
    params.push(
      category.id,
      category.name,
      category.level,
      category.alias,
      index,
      normalizeSearchText(category.name),
    );

    const offset = index * 6;
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`;
  });

  await query(
    `
      INSERT INTO "job_family_categories"
        ("id", "name", "level", "alias", "display_order", "search_text")
      VALUES ${values.join(', ')}
      ON CONFLICT ("id") DO UPDATE SET
        "name" = EXCLUDED."name",
        "level" = EXCLUDED."level",
        "alias" = EXCLUDED."alias",
        "display_order" = EXCLUDED."display_order",
        "search_text" = EXCLUDED."search_text",
        "updated_at" = now()
    `,
    params,
  );
}

async function insertEdges(
  query: (sql: string, params?: unknown[]) => Promise<unknown>,
  categories: CategoryInput[],
) {
  const edges = categories.flatMap((category) =>
    category.children_ids.map((childId, position) => ({
      parentId: category.id,
      childId,
      position,
    })),
  );

  if (edges.length === 0) {
    return;
  }

  const params: unknown[] = [];
  const values = edges.map((edge, index) => {
    params.push(edge.parentId, edge.childId, edge.position);

    const offset = index * 3;
    return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
  });

  await query(
    `
      INSERT INTO "job_family_category_edges"
        ("parent_id", "child_id", "position")
      VALUES ${values.join(', ')}
      ON CONFLICT ("parent_id", "child_id") DO UPDATE SET
        "position" = EXCLUDED."position"
    `,
    params,
  );
}

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
