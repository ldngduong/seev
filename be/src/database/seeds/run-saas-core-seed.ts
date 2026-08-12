import dataSource from '../data-source';
import { defaultAdminAccount, seedSaasCore, serviceProducts } from './saas-core.seed';

async function main() {
  await dataSource.initialize();
  try {
    const configuredPassword = process.env.SEEV_ADMIN_PASSWORD?.trim();
    const admin = {
      email: process.env.SEEV_ADMIN_EMAIL?.trim() || defaultAdminAccount.email,
      password: configuredPassword && configuredPassword.length >= 8
        ? configuredPassword
        : defaultAdminAccount.password,
      fullName: process.env.SEEV_ADMIN_FULL_NAME?.trim() || defaultAdminAccount.fullName,
    };
    if (configuredPassword && configuredPassword.length < 8) {
      console.warn('SEEV_ADMIN_PASSWORD phải có ít nhất 8 ký tự; seed đang dùng mật khẩu mặc định.');
    }
    await dataSource.transaction((manager) => seedSaasCore(manager.query.bind(manager), admin));
    const products = (await dataSource.query(
      `SELECT code, price_credits, is_active FROM service_products ORDER BY code`,
    )) as Array<{ code: string; price_credits: string; is_active: boolean }>;
    if (products.length !== serviceProducts.length) {
      throw new Error(`Seed dịch vụ không đầy đủ: ${products.length}/${serviceProducts.length}.`);
    }
    console.log(`Đã seed ${products.length} dịch vụ SaaS và tài khoản admin ${admin.email}.`);
  } finally {
    await dataSource.destroy();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
