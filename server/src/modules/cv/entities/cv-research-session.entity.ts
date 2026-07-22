import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { CvAuditResult } from '../../ai/schemas/cv-audit-result.schema';
import { JobSearchIntent } from '../../crawler/entities/job-search-intent.entity';
import { JobFamilyCategory } from '../../job-category/entities/job-family-category.entity';
import { SeniorityLevel } from '../../seniority/entities/seniority-level.entity';
import { User } from '../../users/entities/user.entity';
import { CvAudit } from './cv-audit.entity';
import { UserCv } from './user-cv.entity';

export type CvResearchType = 'quick' | 'custom';
export type CvResearchTargetSource = 'ai_inferred' | 'job_category' | 'job_description';

export interface CvResearchJobSuggestionSnapshot {
  match_score: number;
  matched_terms: string[];
  job: {
    id: string;
    source: string;
    source_url: string;
    title: string;
    company_name: string | null;
    salary_text: string | null;
    locations: string[];
    seniority_text: string | null;
    skills: string[];
  };
}

@Entity({ name: 'cv_research_sessions' })
@Index('IDX_cv_research_sessions_user_created', ['userId', 'createdAt'])
export class CvResearchSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @JoinColumn({ name: 'user_id' })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @Column({ name: 'user_cv_id', type: 'uuid' })
  userCvId!: string;

  @JoinColumn({ name: 'user_cv_id' })
  @ManyToOne(() => UserCv, { onDelete: 'CASCADE' })
  userCv!: UserCv;

  @Column({ name: 'cv_audit_id', nullable: true, type: 'uuid' })
  cvAuditId!: string | null;

  @JoinColumn({ name: 'cv_audit_id' })
  @ManyToOne(() => CvAudit, { nullable: true, onDelete: 'SET NULL' })
  cvAudit!: CvAudit | null;

  @Column({ name: 'job_search_intent_id', nullable: true, type: 'uuid' })
  jobSearchIntentId!: string | null;

  @JoinColumn({ name: 'job_search_intent_id' })
  @ManyToOne(() => JobSearchIntent, { nullable: true, onDelete: 'SET NULL' })
  jobSearchIntent!: JobSearchIntent | null;

  @Column({ type: 'varchar' })
  type!: CvResearchType;

  @Column({ name: 'target_source', type: 'varchar' })
  targetSource!: CvResearchTargetSource;

  @Column({ name: 'target_role', nullable: true, type: 'varchar' })
  targetRole!: string | null;

  @Column({ name: 'job_category_id', nullable: true, type: 'int' })
  jobCategoryId!: number | null;

  @JoinColumn({ name: 'job_category_id' })
  @ManyToOne(() => JobFamilyCategory, { nullable: true, onDelete: 'SET NULL' })
  jobCategory!: JobFamilyCategory | null;

  @Column({ name: 'job_category_name', nullable: true, type: 'varchar' })
  jobCategoryName!: string | null;

  @Column({ name: 'seniority_level_id', nullable: true, type: 'uuid' })
  seniorityLevelId!: string | null;

  @JoinColumn({ name: 'seniority_level_id' })
  @ManyToOne(() => SeniorityLevel, { nullable: true, onDelete: 'SET NULL' })
  seniorityLevel!: SeniorityLevel | null;

  @Column({ name: 'seniority_level_name', nullable: true, type: 'varchar' })
  seniorityLevelName!: string | null;

  @Column({ name: 'job_description', nullable: true, type: 'text' })
  jobDescription!: string | null;

  @Column({ default: 'processing', type: 'varchar' })
  status!: 'processing' | 'completed' | 'failed';

  @Column({ name: 'audit_snapshot', nullable: true, type: 'jsonb' })
  auditSnapshot!: CvAuditResult | null;

  @Column({
    name: 'job_suggestions_snapshot',
    default: () => "'[]'::jsonb",
    type: 'jsonb',
  })
  jobSuggestionsSnapshot!: CvResearchJobSuggestionSnapshot[];

  @Column({ nullable: true, type: 'text' })
  error!: string | null;

  @Column({ name: 'completed_at', nullable: true, type: 'timestamp' })
  completedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
