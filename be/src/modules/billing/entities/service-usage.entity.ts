import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'service_usages' })
@Index('UQ_service_usages_session_attempt', ['researchSessionId', 'attempt'], { unique: true })
export class ServiceUsage {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @Column({ name: 'service_product_id', type: 'uuid' }) serviceProductId!: string;
  @Column({ name: 'service_code', type: 'varchar' }) serviceCode!: string;
  @Column({ name: 'service_name', type: 'varchar' }) serviceName!: string;
  @Column({ name: 'unit_price_credits', type: 'bigint' }) unitPriceCredits!: string;
  @Column({ default: 1, type: 'int' }) quantity!: number;
  @Column({ name: 'total_credits', type: 'bigint' }) totalCredits!: string;
  @Column({ name: 'research_session_id', type: 'uuid' }) researchSessionId!: string;
  @Column({ type: 'int' }) attempt!: number;
  @Column({ default: 'reserved', type: 'varchar' }) status!: 'reserved' | 'consumed' | 'refunded';
  @Column({ name: 'reserved_at', type: 'timestamp' }) reservedAt!: Date;
  @Column({ name: 'settled_at', nullable: true, type: 'timestamp' }) settledAt!: Date | null;
  @Column({ name: 'refunded_at', nullable: true, type: 'timestamp' }) refundedAt!: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
