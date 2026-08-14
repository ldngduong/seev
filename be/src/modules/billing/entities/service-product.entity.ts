import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type ServiceCode = 'quick_research' | 'manual_research' | 'job_fit_analysis' | 'external_jd_research' | 'external_link_research' | 'job_suggestion_retry';

@Entity({ name: 'service_products' })
export class ServiceProduct {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index({ unique: true }) @Column({ type: 'varchar' }) code!: ServiceCode;
  @Column({ type: 'varchar' }) name!: string;
  @Column({ nullable: true, type: 'text' }) description!: string | null;
  @Column({ name: 'price_credits', type: 'bigint' }) priceCredits!: string;
  @Column({ name: 'is_active', default: true, type: 'boolean' }) isActive!: boolean;
  @Column({ default: 1, type: 'int' }) version!: number;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
