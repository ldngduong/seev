import dataSource from './data-source';
import { seedItTaxonomy } from './seeds/it-taxonomy.seed';
import { seedSaasCore } from './seeds/saas-core.seed';

const initializationLockId = 2_026_081_200_001;

async function initializeDatabase() {
  await dataSource.initialize();

  try {
    await dataSource.query('SELECT pg_advisory_lock($1::bigint)', [
      initializationLockId,
    ]);

    const migrations = await dataSource.runMigrations({ transaction: 'all' });
    console.log(`Đã chạy ${migrations.length} migration mới.`);

    await dataSource.transaction((manager) =>
      seedItTaxonomy(manager.query.bind(manager)),
    );
    console.log('Đã đồng bộ taxonomy CNTT.');

    const adminEmail = process.env.SEEV_ADMIN_EMAIL?.trim();
    const adminPassword = process.env.SEEV_ADMIN_PASSWORD?.trim();
    const adminFullName = process.env.SEEV_ADMIN_FULL_NAME?.trim();

    if (
      !adminEmail ||
      !adminFullName ||
      !adminPassword ||
      adminPassword.length < 8
    ) {
      throw new Error(
        'Docker bootstrap yêu cầu SEEV_ADMIN_EMAIL, SEEV_ADMIN_FULL_NAME và SEEV_ADMIN_PASSWORD (tối thiểu 8 ký tự) trong be/.env.',
      );
    }

    await dataSource.transaction((manager) =>
      seedSaasCore(manager.query.bind(manager), {
        email: adminEmail,
        password: adminPassword,
        fullName: adminFullName,
      }),
    );
    console.log(`Đã đồng bộ dịch vụ SaaS và tài khoản admin ${adminEmail}.`);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource
        .query('SELECT pg_advisory_unlock($1::bigint)', [initializationLockId])
        .catch(() => undefined);
      await dataSource.destroy();
    }
  }
}

void initializeDatabase().catch((error: unknown) => {
  console.error('Khởi tạo cơ sở dữ liệu thất bại.', error);
  process.exitCode = 1;
});
