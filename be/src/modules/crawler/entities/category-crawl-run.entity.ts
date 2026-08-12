import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import type { CategoryCrawlReport } from '../crawl-notify.service';

export type CategoryCrawlRunStatus = 'queued' | 'processing' | 'completed' | 'partial_failed' | 'failed' | 'cancelled';

@Entity({ name: 'category_crawl_runs' })
@Index('IDX_category_crawl_runs_created', ['createdAt'])
export class CategoryCrawlRun {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index({ unique: true }) @Column({ name: 'trigger_key', type: 'varchar' }) triggerKey!: string;
  @Column({ name: 'trigger_type', type: 'varchar' }) triggerType!: 'scheduled' | 'manual';
  @Column({ name: 'triggered_by_user_id', nullable: true, type: 'uuid' }) triggeredByUserId!: string | null;
  @Column({ default: 'queued', type: 'varchar' }) status!: CategoryCrawlRunStatus;
  @Column({ default: 'queued', type: 'varchar' }) phase!: string;
  @Column({ default: 0, type: 'smallint' }) progress!: number;
  @Column({ name: 'progress_message', nullable: true, type: 'varchar' }) progressMessage!: string | null;
  @Column({ name: 'total_targets', default: 0, type: 'int' }) totalTargets!: number;
  @Column({ name: 'completed_targets', default: 0, type: 'int' }) completedTargets!: number;
  @Column({ name: 'failed_targets', default: 0, type: 'int' }) failedTargets!: number;
  @Column({ name: 'total_jobs', default: 0, type: 'int' }) totalJobs!: number;
  @Column({ name: 'saved_jobs', default: 0, type: 'int' }) savedJobs!: number;
  @Column({ name: 'current_source', nullable: true, type: 'varchar' }) currentSource!: string | null;
  @Column({ name: 'current_category', nullable: true, type: 'varchar' }) currentCategory!: string | null;
  @Column({ name: 'cancel_requested', default: false, type: 'boolean' }) cancelRequested!: boolean;
  @Column({ name: 'bull_job_id', nullable: true, type: 'varchar' }) bullJobId!: string | null;
  @Column({ name: 'report_snapshot', nullable: true, type: 'jsonb' }) reportSnapshot!: CategoryCrawlReport | null;
  @Column({ nullable: true, type: 'text' }) error!: string | null;
  @Column({ name: 'started_at', nullable: true, type: 'timestamptz' }) startedAt!: Date | null;
  @Column({ name: 'completed_at', nullable: true, type: 'timestamptz' }) completedAt!: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
