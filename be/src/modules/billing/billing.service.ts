import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { CreditAccount } from './entities/credit-account.entity';
import { CreditTransaction, type CreditTransactionType } from './entities/credit-transaction.entity';
import { ServiceProduct, type ServiceCode } from './entities/service-product.entity';
import { ServiceUsage } from './entities/service-usage.entity';

@Injectable()
export class BillingService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ServiceProduct) private readonly products: Repository<ServiceProduct>,
    @InjectRepository(CreditAccount) private readonly accounts: Repository<CreditAccount>,
    @InjectRepository(CreditTransaction) private readonly transactions: Repository<CreditTransaction>,
    @InjectRepository(ServiceUsage) private readonly usages: Repository<ServiceUsage>,
  ) {}

  async getCatalog() {
    const items = await this.products.find({ where: { isActive: true }, order: { code: 'ASC' } });
    return items.map((item) => this.toProduct(item));
  }

  async getAccount(userId: string) {
    const account = await this.ensureAccount(this.dataSource.manager, userId);
    return { balance: account.balance };
  }

  async listTransactions(userId: string, limit = 50) {
    const items = await this.transactions.find({ where: { userId }, order: { createdAt: 'DESC' }, take: Math.min(Math.max(limit, 1), 100) });
    return items.map((item) => ({
      id: item.id, type: item.type, amount_delta: item.amountDelta,
      balance_before: item.balanceBefore, balance_after: item.balanceAfter,
      service_product_id: item.serviceProductId, research_session_id: item.researchSessionId,
      actor_user_id: item.actorUserId, reason: item.reason, metadata: item.metadata,
      created_at: item.createdAt,
    }));
  }

  async reserveResearch(manager: EntityManager, input: { userId: string; serviceCode: ServiceCode; sessionId: string; attempt: number }) {
    const usageRepository = manager.getRepository(ServiceUsage);
    const existing = await usageRepository.findOneBy({ researchSessionId: input.sessionId, attempt: input.attempt });
    if (existing) return existing;

    const product = await manager.getRepository(ServiceProduct).findOneBy({ code: input.serviceCode, isActive: true });
    if (!product) throw new BadRequestException(`Dịch vụ ${input.serviceCode} chưa được cấu hình.`);
    const price = BigInt(product.priceCredits);
    const account = await this.lockAccount(manager, input.userId);
    const before = BigInt(account.balance);
    if (before < price) {
      throw new HttpException({
        code: 'INSUFFICIENT_CREDITS', message: 'Số dư credit không đủ để sử dụng dịch vụ.',
        balance: account.balance, required: product.priceCredits, service_code: product.code,
      }, HttpStatus.PAYMENT_REQUIRED);
    }
    const after = before - price;
    account.balance = after.toString();
    await manager.getRepository(CreditAccount).save(account);
    await this.createTransaction(manager, {
      userId: input.userId, type: 'service_reserve', delta: -price,
      before, after, serviceProductId: product.id, researchSessionId: input.sessionId,
      actorUserId: input.userId, idempotencyKey: `research:${input.sessionId}:${input.attempt}:reserve`,
      reason: `Đặt trước credit cho ${product.name}`, metadata: { service_code: product.code, service_version: product.version },
    });
    return usageRepository.save(usageRepository.create({
      userId: input.userId, serviceProductId: product.id, serviceCode: product.code,
      serviceName: product.name, unitPriceCredits: product.priceCredits, quantity: 1,
      totalCredits: product.priceCredits, researchSessionId: input.sessionId,
      attempt: input.attempt, status: 'reserved', reservedAt: new Date(), settledAt: null, refundedAt: null,
    }));
  }

  async settleResearch(sessionId: string, attempt: number) {
    return this.dataSource.transaction(async (manager) => {
      const usage = await manager.getRepository(ServiceUsage).findOne({
        where: { researchSessionId: sessionId, attempt }, lock: { mode: 'pessimistic_write' },
      });
      if (!usage || usage.status !== 'reserved') return usage;
      usage.status = 'consumed';
      usage.settledAt = new Date();
      return manager.getRepository(ServiceUsage).save(usage);
    });
  }

  async refundResearch(sessionId: string, attempt: number, reason: string) {
    return this.dataSource.transaction(async (manager) => {
      const usage = await manager.getRepository(ServiceUsage).findOne({
        where: { researchSessionId: sessionId, attempt }, lock: { mode: 'pessimistic_write' },
      });
      if (!usage || usage.status === 'refunded') return usage;
      if (usage.status === 'consumed') return usage;
      const account = await this.lockAccount(manager, usage.userId);
      const before = BigInt(account.balance);
      const delta = BigInt(usage.totalCredits);
      const after = before + delta;
      account.balance = after.toString();
      await manager.getRepository(CreditAccount).save(account);
      await this.createTransaction(manager, {
        userId: usage.userId, type: 'refund', delta, before, after,
        serviceProductId: usage.serviceProductId, researchSessionId: usage.researchSessionId,
        actorUserId: null, idempotencyKey: `research:${sessionId}:${attempt}:refund`, reason, metadata: { attempt },
      });
      usage.status = 'refunded';
      usage.refundedAt = new Date();
      return manager.getRepository(ServiceUsage).save(usage);
    });
  }

  async adjust(input: { userId: string; actorUserId: string; amountDelta: string; reason: string; idempotencyKey: string }) {
    const delta = BigInt(input.amountDelta);
    if (delta === 0n) throw new BadRequestException('Số credit điều chỉnh phải khác 0.');
    return this.dataSource.transaction(async (manager) => {
      const existing = await manager.getRepository(CreditTransaction).findOneBy({ idempotencyKey: input.idempotencyKey });
      if (existing) return { transaction: existing, balance: existing.balanceAfter };
      const account = await this.lockAccount(manager, input.userId);
      const before = BigInt(account.balance);
      const after = before + delta;
      if (after < 0n) throw new BadRequestException('Điều chỉnh làm số dư credit âm.');
      account.balance = after.toString();
      await manager.getRepository(CreditAccount).save(account);
      const transaction = await this.createTransaction(manager, {
        userId: input.userId, type: delta > 0n ? 'admin_grant' : 'admin_deduct', delta,
        before, after, serviceProductId: null, researchSessionId: null,
        actorUserId: input.actorUserId, idempotencyKey: input.idempotencyKey,
        reason: input.reason, metadata: {},
      });
      return { transaction, balance: account.balance };
    });
  }

  async updatePrice(productId: string, priceCredits: string) {
    const price = BigInt(priceCredits);
    if (price < 0n) throw new BadRequestException('Giá dịch vụ không được âm.');
    const product = await this.products.findOneBy({ id: productId });
    if (!product) throw new BadRequestException('Dịch vụ không tồn tại.');
    product.priceCredits = price.toString();
    product.version += 1;
    return this.toProduct(await this.products.save(product));
  }

  private async ensureAccount(manager: EntityManager, userId: string) {
    await manager.createQueryBuilder().insert().into(CreditAccount).values({ userId, balance: '0' }).orIgnore().execute();
    return manager.getRepository(CreditAccount).findOneByOrFail({ userId });
  }

  private async lockAccount(manager: EntityManager, userId: string) {
    await this.ensureAccount(manager, userId);
    return manager.getRepository(CreditAccount).findOneOrFail({ where: { userId }, lock: { mode: 'pessimistic_write' } });
  }

  private createTransaction(manager: EntityManager, input: {
    userId: string; type: CreditTransactionType; delta: bigint; before: bigint; after: bigint;
    serviceProductId: string | null; researchSessionId: string | null; actorUserId: string | null;
    idempotencyKey: string; reason: string | null; metadata: Record<string, unknown>;
  }) {
    const repository = manager.getRepository(CreditTransaction);
    return repository.save(repository.create({
      userId: input.userId, type: input.type, amountDelta: input.delta.toString(),
      balanceBefore: input.before.toString(), balanceAfter: input.after.toString(),
      serviceProductId: input.serviceProductId, researchSessionId: input.researchSessionId,
      actorUserId: input.actorUserId, idempotencyKey: input.idempotencyKey,
      reason: input.reason, metadata: input.metadata,
    }));
  }

  private toProduct(item: ServiceProduct) {
    return { id: item.id, code: item.code, name: item.name, description: item.description, price_credits: item.priceCredits, is_active: item.isActive, version: item.version, updated_at: item.updatedAt };
  }
}
