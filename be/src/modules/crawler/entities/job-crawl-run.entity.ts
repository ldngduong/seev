import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { JobSearchIntent } from './job-search-intent.entity';
import type { JobSource } from '../types/job-source.type';

@Entity({ name: 'job_crawl_runs' })
export class JobCrawlRun {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'intent_id', type: 'uuid' })
  intentId!: string;

  @JoinColumn({ name: 'intent_id' })
  @ManyToOne(() => JobSearchIntent, { onDelete: 'CASCADE' })
  intent!: JobSearchIntent;

  @Column({ type: 'varchar' })
  source!: JobSource;

  @Column({ default: 'queued', type: 'varchar' })
  status!: 'queued' | 'processing' | 'completed' | 'failed';

  @Column({ default: () => "'{}'::jsonb", type: 'jsonb' })
  query!: Record<string, unknown>;

  @Column({ name: 'fetched_count', default: 0, type: 'int' })
  fetchedCount!: number;

  @Column({ name: 'saved_count', default: 0, type: 'int' })
  savedCount!: number;

  @Column({ nullable: true, type: 'text' })
  error!: string | null;

  @Column({ name: 'started_at', nullable: true, type: 'timestamptz' })
  startedAt!: Date | null;

  @Column({ name: 'completed_at', nullable: true, type: 'timestamptz' })
  completedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
