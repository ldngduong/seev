import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { ActivityService } from '../activity/activity.service';
import { BillingService } from '../billing/billing.service';
import { CreditAccount } from '../billing/entities/credit-account.entity';
import { CreditTransaction } from '../billing/entities/credit-transaction.entity';
import { ServiceProduct } from '../billing/entities/service-product.entity';
import { ServiceUsage } from '../billing/entities/service-usage.entity';
import { CvResearchSession } from '../cv/entities/cv-research-session.entity';
import { UserCv } from '../cv/entities/user-cv.entity';
import { User } from '../users/entities/user.entity';
import { NewAccountCreditsSetting, SystemSettingsService } from '../system-settings/system-settings.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(CreditAccount) private readonly accounts: Repository<CreditAccount>,
    @InjectRepository(CreditTransaction) private readonly transactions: Repository<CreditTransaction>,
    @InjectRepository(ServiceProduct) private readonly products: Repository<ServiceProduct>,
    @InjectRepository(ServiceUsage) private readonly usages: Repository<ServiceUsage>,
    @InjectRepository(CvResearchSession) private readonly sessions: Repository<CvResearchSession>,
    @InjectRepository(UserCv) private readonly cvs: Repository<UserCv>,
    private readonly billing: BillingService,
    private readonly activity: ActivityService,
    private readonly systemSettings: SystemSettingsService,
    private readonly dataSource: DataSource,
  ) {}

  async dashboard() {
    const [summaryRows, trend, services, crawlRows] = await Promise.all([
      this.dataSource.query(`
        SELECT
          (SELECT count(*)::int FROM users) AS users,
          (SELECT count(*)::int FROM users WHERE created_at >= now() - interval '30 days') AS new_users_30d,
          (SELECT count(*)::int FROM users WHERE created_at >= now() - interval '60 days' AND created_at < now() - interval '30 days') AS new_users_previous_30d,
          (SELECT count(*)::int FROM cv_research_sessions) AS researches,
          (SELECT count(*)::int FROM cv_research_sessions WHERE created_at >= now() - interval '30 days') AS researches_30d,
          (SELECT count(*)::int FROM cv_research_sessions WHERE created_at >= now() - interval '60 days' AND created_at < now() - interval '30 days') AS researches_previous_30d,
          (SELECT count(*)::int FROM cv_research_sessions WHERE status = 'completed' AND created_at >= now() - interval '30 days') AS completed_30d,
          (SELECT count(*)::int FROM cv_research_sessions WHERE status = 'failed' AND created_at >= now() - interval '30 days') AS failed_30d,
          COALESCE((SELECT sum(total_credits) FROM service_usages WHERE status = 'consumed' AND created_at >= now() - interval '30 days'), 0)::text AS consumed_credits_30d,
          COALESCE((SELECT sum(total_credits) FROM service_usages WHERE status = 'consumed' AND created_at >= now() - interval '60 days' AND created_at < now() - interval '30 days'), 0)::text AS consumed_credits_previous_30d
      `),
      this.dataSource.query(`
        WITH days AS (SELECT generate_series(current_date - interval '29 days', current_date, interval '1 day')::date AS day),
        users_by_day AS (SELECT created_at::date AS day, count(*)::int AS users FROM users WHERE created_at >= current_date - interval '29 days' GROUP BY created_at::date),
        research_by_day AS (SELECT created_at::date AS day, count(*)::int AS researches FROM cv_research_sessions WHERE created_at >= current_date - interval '29 days' GROUP BY created_at::date),
        credits_by_day AS (SELECT created_at::date AS day, sum(total_credits)::int AS credits FROM service_usages WHERE status = 'consumed' AND created_at >= current_date - interval '29 days' GROUP BY created_at::date)
        SELECT to_char(days.day, 'YYYY-MM-DD') AS date, COALESCE(users, 0)::int AS users,
          COALESCE(researches, 0)::int AS researches, COALESCE(credits, 0)::int AS credits
        FROM days LEFT JOIN users_by_day USING (day) LEFT JOIN research_by_day USING (day) LEFT JOIN credits_by_day USING (day) ORDER BY days.day
      `),
      this.dataSource.query(`
        SELECT service_code, service_name, count(*)::int AS uses, COALESCE(sum(total_credits), 0)::text AS credits
        FROM service_usages WHERE status = 'consumed' AND created_at >= now() - interval '30 days'
        GROUP BY service_code, service_name ORDER BY uses DESC
      `),
      this.dataSource.query(`SELECT id, trigger_type, status, progress, saved_jobs, failed_targets, created_at, completed_at FROM category_crawl_runs ORDER BY created_at DESC LIMIT 1`),
    ]);
    const summary = summaryRows[0] as Record<string, unknown>;
    const finished = Number(summary.completed_30d) + Number(summary.failed_30d);
    return {
      summary: {
        ...summary,
        success_rate: finished ? Math.round((Number(summary.completed_30d) / finished) * 100) : null,
        user_growth: this.change(Number(summary.new_users_30d), Number(summary.new_users_previous_30d)),
        research_growth: this.change(Number(summary.researches_30d), Number(summary.researches_previous_30d)),
        credit_growth: this.change(Number(summary.consumed_credits_30d), Number(summary.consumed_credits_previous_30d)),
      },
      trend, service_breakdown: services, latest_crawl: crawlRows[0] ?? null,
    };
  }

  async listUsers(page = 1, pageSize = 20, search?: string) {
    const query = this.users.createQueryBuilder('user').leftJoinAndSelect(CreditAccount, 'account', 'account.user_id = user.id').select(['user.id AS id', 'user.full_name AS full_name', 'user.email AS email', 'user.username AS username', 'user.role AS role', 'user.created_at AS created_at', 'COALESCE(account.balance, 0) AS credits']).orderBy('user.created_at', 'DESC').offset((page - 1) * pageSize).limit(pageSize);
    if (search?.trim()) query.where('(user.email ILIKE :search OR user.full_name ILIKE :search OR user.username ILIKE :search)', { search: `%${search.trim()}%` });
    const [items, total] = await Promise.all([query.getRawMany(), this.userCount(search)]);
    return { items, meta: { page, page_size: pageSize, total, total_pages: Math.max(1, Math.ceil(total / pageSize)) } };
  }

  async getUser(userId: string) {
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new BadRequestException('Người dùng không tồn tại.');
    const [account, sessionCount, cvCount] = await Promise.all([
      this.billing.getAccount(userId),
      this.sessions.countBy({ userId }),
      this.cvs.countBy({ userId }),
    ]);
    const { password: _password, ...safeUser } = user;
    return { user: safeUser, account, summary: { sessions: sessionCount, cvs: cvCount } };
  }

  listUserTransactions(userId: string, page: number, pageSize: number) {
    return this.billing.listTransactionsPage(userId, page, pageSize);
  }

  listUserActivities(userId: string, page: number, pageSize: number) {
    return this.activity.listForUserPage(userId, page, pageSize);
  }

  async adjustCredits(userId: string, actorUserId: string, amount: number, reason: string, idempotencyKey: string) {
    const result = await this.billing.adjust({ userId, actorUserId, amountDelta: String(amount), reason, idempotencyKey });
    await this.activity.record({ subjectUserId: userId, actorUserId, action: 'admin.credit_adjusted', resourceType: 'credit_transaction', resourceId: result.transaction.id, metadata: { amount, reason } });
    return result;
  }

  catalog() { return this.billing.getCatalog(); }
  getNewAccountCredits() { return this.systemSettings.getNewAccountCredits(); }
  async updateNewAccountCredits(value: NewAccountCreditsSetting, actorUserId: string) {
    const setting = await this.systemSettings.updateNewAccountCredits(value, actorUserId);
    await this.activity.record({
      actorUserId,
      action: 'admin.new_account_credits_updated',
      resourceType: 'system_setting',
      resourceId: null,
      metadata: { enabled: setting.enabled, credits: setting.credits },
    });
    return setting;
  }
  async updatePrice(productId: string, price: number, actorUserId: string) {
    const product = await this.billing.updatePrice(productId, String(price));
    await this.activity.record({ actorUserId, action: 'admin.service_price_updated', resourceType: 'service_product', resourceId: product.id, metadata: { price_credits: price, version: product.version } });
    return product;
  }

  private async userCount(search?: string) {
    const query = this.users.createQueryBuilder('user');
    if (search?.trim()) query.where('(user.email ILIKE :search OR user.full_name ILIKE :search OR user.username ILIKE :search)', { search: `%${search.trim()}%` });
    return query.getCount();
  }

  private change(current: number, previous: number) {
    if (previous === 0) return current === 0 ? 0 : null;
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }
}
