import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';
import type { JobSource } from '../types/job-source.type';

@Entity({ name: 'job_search_intents' })
export class JobSearchIntent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', nullable: true, type: 'uuid' })
  userId!: string | null;

  @JoinColumn({ name: 'user_id' })
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  user!: User | null;

  @Column({ name: 'audit_id', nullable: true, type: 'uuid' })
  auditId!: string | null;

  @Column({ name: 'research_session_id', nullable: true, type: 'uuid' })
  researchSessionId!: string | null;

  @Column({ name: 'research_session_attempt', nullable: true, type: 'int' })
  researchSessionAttempt!: number | null;

  @Column({ name: 'target_role', nullable: true, type: 'varchar' })
  targetRole!: string | null;

  @Column({ name: 'job_category_id', nullable: true, type: 'int' })
  jobCategoryId!: number | null;

  @Column({ name: 'job_category_name', nullable: true, type: 'varchar' })
  jobCategoryName!: string | null;

  @Column({ name: 'seniority_level_id', nullable: true, type: 'uuid' })
  seniorityLevelId!: string | null;

  @Column({ name: 'seniority_level_name', nullable: true, type: 'varchar' })
  seniorityLevelName!: string | null;

  @Column({ default: 'queued', type: 'varchar' })
  status!: 'queued' | 'processing' | 'completed' | 'failed';

  @Column({ default: () => "'[]'::jsonb", type: 'jsonb' })
  keywords!: string[];

  @Column({
    name: 'search_queries',
    default: () => "'[]'::jsonb",
    type: 'jsonb',
  })
  searchQueries!: string[];

  @Column({ default: () => "'[]'::jsonb", type: 'jsonb' })
  locations!: string[];

  @Column({ name: 'requested_sources', type: 'jsonb' })
  requestedSources!: JobSource[];

  @Column({
    name: 'completed_sources',
    default: () => "'[]'::jsonb",
    type: 'jsonb',
  })
  completedSources!: JobSource[];

  @Column({ name: 'total_jobs', default: 0, type: 'int' })
  totalJobs!: number;

  @Column({ name: 'max_jobs_per_source', type: 'int' })
  maxJobsPerSource!: number;

  @Column({ nullable: true, type: 'text' })
  error!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
