import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { JobSource } from '../types/job-source.type';

@Entity({ name: 'job_posts' })
@Index('UQ_job_posts_source_job_id', ['source', 'sourceJobId'], {
  unique: true,
})
@Index('UQ_job_posts_source_dedup_key', ['source', 'dedupKey'], {
  unique: true,
})
@Index('IDX_job_posts_category_expiry', ['jobCategoryId', 'expiredAt'])
export class JobPost {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  source!: JobSource;

  @Column({ name: 'source_job_id', type: 'varchar' })
  sourceJobId!: string;

  @Column({ name: 'source_url', type: 'text' })
  sourceUrl!: string;

  @Column({ name: 'dedup_key', type: 'varchar', length: 32 })
  dedupKey!: string;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ name: 'company_name', nullable: true, type: 'varchar' })
  companyName!: string | null;

  @Column({ name: 'salary_text', nullable: true, type: 'varchar' })
  salaryText!: string | null;

  @Column({ name: 'salary_min', nullable: true, type: 'bigint' })
  salaryMin!: number | null;

  @Column({ name: 'salary_max', nullable: true, type: 'bigint' })
  salaryMax!: number | null;

  @Column({ name: 'salary_currency', nullable: true, type: 'varchar' })
  salaryCurrency!: string | null;

  @Column({ name: 'job_type', nullable: true, type: 'varchar' })
  jobType!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  experience!: string | null;

  @Column({ name: 'experience_min', nullable: true, type: 'double precision' })
  experienceMin!: number | null;

  @Column({ name: 'experience_max', nullable: true, type: 'double precision' })
  experienceMax!: number | null;

  @Column({ nullable: true, type: 'text' })
  logo!: string | null;

  @Column({ default: () => "'[]'::jsonb", type: 'jsonb' })
  locations!: string[];

  @Column({ name: 'job_category_id', type: 'uuid' })
  jobCategoryId!: string;

  @Column({ name: 'job_category_name', nullable: true, type: 'varchar' })
  jobCategoryName!: string | null;

  @Column({
    name: 'category_confidence',
    nullable: true,
    type: 'double precision',
  })
  categoryConfidence!: number | null;

  @Column({
    default: () => "'{}'::jsonb",
    name: 'category_evidence',
    type: 'jsonb',
  })
  categoryEvidence!: Record<string, unknown>;

  @Column({
    default: () => "'{}'::jsonb",
    name: 'source_category_raw',
    type: 'jsonb',
  })
  sourceCategoryRaw!: Record<string, unknown>;

  @Column({ default: () => "'[]'::jsonb", type: 'jsonb' })
  skills!: string[];

  @Column({ name: 'search_text', type: 'text' })
  searchText!: string;

  @Column({ name: 'content_hash', type: 'varchar' })
  contentHash!: string;

  @Column({ name: 'posted_at', nullable: true, type: 'timestamptz' })
  postedAt!: Date | null;

  @Column({ name: 'expired_at', type: 'timestamptz' })
  expiredAt!: Date;

  @Column({ name: 'last_seen_at', type: 'timestamptz' })
  lastSeenAt!: Date;

  @Column({ default: () => "'{}'::jsonb", type: 'jsonb' })
  raw!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
