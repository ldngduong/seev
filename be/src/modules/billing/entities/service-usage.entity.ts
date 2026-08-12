import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'service_usages' })
@Index('UQ_service_usages_subject_attempt', ['subjectType', 'subjectId', 'attempt'], { unique: true })
export class ServiceUsage {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @Column({ name: 'service_product_id', type: 'uuid' }) serviceProductId!: string;
  @Column({ name: 'service_code', type: 'varchar' }) serviceCode!: string;
  @Column({ name: 'service_name', type: 'varchar' }) serviceName!: string;
  @Column({ name: 'unit_price_credits', type: 'bigint' }) unitPriceCredits!: string;
  @Column({ default: 1, type: 'int' }) quantity!: number;
  @Column({ name: 'total_credits', type: 'bigint' }) totalCredits!: string;
  @Column({ name: 'subject_type', type: 'varchar' }) subjectType!: 'cv_research' | 'job_fit';
  @Column({ name: 'subject_id', type: 'uuid' }) subjectId!: string;
  @Column({ type: 'int' }) attempt!: number;
  @Column({ default: 'reserved', type: 'varchar' }) status!: 'reserved' | 'consumed' | 'refunded';
  @Column({ name: 'reserved_at', type: 'timestamptz' }) reservedAt!: Date;
  @Column({ name: 'settled_at', nullable: true, type: 'timestamptz' }) settledAt!: Date | null;
  @Column({ name: 'refunded_at', nullable: true, type: 'timestamptz' }) refundedAt!: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
