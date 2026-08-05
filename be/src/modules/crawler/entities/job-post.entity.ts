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
@Index('IDX_job_posts_category_seniority', [
  'jobCategoryId',
  'seniorityLevelId',
])
export class JobPost {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  source!: JobSource;

  @Column({ name: 'source_job_id', type: 'varchar' })
  sourceJobId!: string;

  @Column({ name: 'source_url', type: 'text' })
  sourceUrl!: string;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ name: 'company_name', nullable: true, type: 'varchar' })
  companyName!: string | null;

  @Column({ name: 'salary_text', nullable: true, type: 'varchar' })
  salaryText!: string | null;

  @Column({ default: () => "'[]'::jsonb", type: 'jsonb' })
  locations!: string[];

  @Column({ name: 'seniority_text', nullable: true, type: 'varchar' })
  seniorityText!: string | null;

  @Column({ name: 'job_category_id', nullable: true, type: 'int' })
  jobCategoryId!: number | null;

  @Column({ name: 'job_category_name', nullable: true, type: 'varchar' })
  jobCategoryName!: string | null;

  @Column({ name: 'seniority_level_id', nullable: true, type: 'uuid' })
  seniorityLevelId!: string | null;

  @Column({ name: 'seniority_level_name', nullable: true, type: 'varchar' })
  seniorityLevelName!: string | null;

  @Column({ nullable: true, type: 'text' })
  description!: string | null;

  @Column({ nullable: true, type: 'text' })
  requirements!: string | null;

  @Column({ nullable: true, type: 'text' })
  benefits!: string | null;

  @Column({ default: () => "'[]'::jsonb", type: 'jsonb' })
  skills!: string[];

  @Column({ name: 'search_text', type: 'text' })
  searchText!: string;

  @Column({ name: 'content_hash', type: 'varchar' })
  contentHash!: string;

  @Column({ name: 'posted_at', nullable: true, type: 'timestamp' })
  postedAt!: Date | null;

  @Column({ name: 'expired_at', nullable: true, type: 'timestamp' })
  expiredAt!: Date | null;

  @Column({ name: 'last_seen_at', type: 'timestamp' })
  lastSeenAt!: Date;

  @Column({ default: () => "'{}'::jsonb", type: 'jsonb' })
  raw!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
