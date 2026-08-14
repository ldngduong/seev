export const serviceProducts = [
  {
    id: '20000000-0000-4000-8000-000000000001',
    code: 'quick_research',
    name: 'Research nhanh',
    description: 'AI suy luận ngành và cấp bậc từ CV, audit CV và gợi ý việc làm phù hợp.',
    priceCredits: 12,
  },
  {
    id: '20000000-0000-4000-8000-000000000002',
    code: 'manual_research',
    name: 'Research tùy chỉnh',
    description: 'Audit CV theo ngành, cấp bậc và địa điểm do người dùng lựa chọn.',
    priceCredits: 10,
  },
  {
    id: '20000000-0000-4000-8000-000000000003',
    code: 'job_fit_analysis',
    name: 'Đánh giá độ phù hợp việc làm',
    description: 'Phân tích mức độ phù hợp giữa một CV đã lưu và một việc làm cụ thể.',
    priceCredits: 3,
  },
  {
    id: '20000000-0000-4000-8000-000000000004',
    code: 'external_jd_research',
    name: 'Đánh giá theo JD',
    description: 'Đối chiếu CV với JD được dán hoặc tải lên.',
    priceCredits: 5,
  },
  {
    id: '20000000-0000-4000-8000-000000000005',
    code: 'external_link_research',
    name: 'Đánh giá theo liên kết tuyển dụng',
    description: 'Đọc nội dung tuyển dụng từ liên kết rồi đối chiếu với CV.',
    priceCredits: 8,
  },
  {
    id: '20000000-0000-4000-8000-000000000006',
    code: 'job_suggestion_retry',
    name: 'Thử lại gợi ý việc làm',
    description: 'Chạy lại bước tìm và đối chiếu việc làm cho một research đã có kết quả đánh giá CV.',
    priceCredits: 2,
  },
] as const;

type Query = (sql: string, parameters?: unknown[]) => Promise<unknown>;
type AdminSeedInput = { email: string; password: string; fullName: string };

export async function seedSaasCore(query: Query, admin: AdminSeedInput = defaultAdminAccount) {
  await query(
    `INSERT INTO system_settings (key, value)
     VALUES ('new_account_credits', '{"enabled":false,"credits":0}'::jsonb)
     ON CONFLICT (key) DO NOTHING`,
  );

  for (const product of serviceProducts) {
    await query(
      `INSERT INTO service_products (id, code, name, description, price_credits, is_active, version)
       VALUES ($1, $2, $3, $4, $5, true, 1)
       ON CONFLICT (code) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         is_active = true,
         updated_at = now()`,
      [product.id, product.code, product.name, product.description, product.priceCredits],
    );
  }

  const email = admin.email.trim().toLowerCase();
  const fullName = admin.fullName.trim();
  if (!email || !fullName || admin.password.length < 8) {
    throw new Error('Thông tin tài khoản admin seed không hợp lệ.');
  }
  const passwordHash = await hash(admin.password, 12);
  const rows = (await query(
    `INSERT INTO users (full_name, email, password, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO UPDATE SET
       full_name = EXCLUDED.full_name,
       password = EXCLUDED.password,
       role = 'admin',
       updated_at = now()
     RETURNING id`,
    [fullName, email, passwordHash],
  )) as Array<{ id: string }>;
  const adminUser = rows[0];
  if (!adminUser) throw new Error(`Không thể seed tài khoản admin ${email}.`);
  await query(
    `INSERT INTO credit_accounts (user_id, balance)
     VALUES ($1, 0)
     ON CONFLICT (user_id) DO NOTHING`,
    [adminUser.id],
  );
}
import { hash } from 'bcryptjs';

export const defaultAdminAccount = {
  email: 'admin@seev.local',
  password: 'Admin@123456',
  fullName: 'Seev Admin',
} as const;
