import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type CreditTransactionType = 'opening_balance' | 'admin_grant' | 'admin_deduct' | 'service_reserve' | 'service_charge' | 'refund';

@Entity({ name: 'credit_transactions' })
@Index('IDX_credit_transactions_user_created', ['userId', 'createdAt'])
export class CreditTransaction {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @Column({ type: 'varchar' }) type!: CreditTransactionType;
  @Column({ name: 'amount_delta', type: 'bigint' }) amountDelta!: string;
  @Column({ name: 'balance_before', type: 'bigint' }) balanceBefore!: string;
  @Column({ name: 'balance_after', type: 'bigint' }) balanceAfter!: string;
  @Column({ name: 'service_product_id', nullable: true, type: 'uuid' }) serviceProductId!: string | null;
  @Column({ name: 'research_session_id', nullable: true, type: 'uuid' }) researchSessionId!: string | null;
  @Column({ name: 'actor_user_id', nullable: true, type: 'uuid' }) actorUserId!: string | null;
  @Index({ unique: true }) @Column({ name: 'idempotency_key', type: 'varchar' }) idempotencyKey!: string;
  @Column({ nullable: true, type: 'text' }) reason!: string | null;
  @Column({ default: () => "'{}'::jsonb", type: 'jsonb' }) metadata!: Record<string, unknown>;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}
