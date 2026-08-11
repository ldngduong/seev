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
import { UserCv } from './user-cv.entity';

@Entity({ name: 'cv_audits' })
export class CvAudit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', nullable: true, type: 'uuid' })
  userId!: string | null;

  @JoinColumn({ name: 'user_id' })
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  user!: User | null;

  @Column({ name: 'user_cv_id', nullable: true, type: 'uuid' })
  userCvId!: string | null;

  @JoinColumn({ name: 'user_cv_id' })
  @ManyToOne(() => UserCv, { nullable: true, onDelete: 'SET NULL' })
  userCv!: UserCv | null;

  @Column({ name: 'research_session_id', nullable: true, type: 'uuid' })
  researchSessionId!: string | null;

  @Column({ name: 'research_type', nullable: true, type: 'varchar' })
  researchType!: 'quick' | 'custom' | null;

  @Column({ name: 'target_role', nullable: true, type: 'varchar' })
  targetRole!: string | null;

  @Column({ name: 'job_category_id', nullable: true, type: 'uuid' })
  jobCategoryId!: string | null;

  @Column({ name: 'job_category_name', nullable: true, type: 'varchar' })
  jobCategoryName!: string | null;

  @Column({ name: 'seniority_level_id', nullable: true, type: 'uuid' })
  seniorityLevelId!: string | null;

  @Column({ name: 'seniority_level_name', nullable: true, type: 'varchar' })
  seniorityLevelName!: string | null;

  @Column({ name: 'file_name' })
  fileName!: string;

  @Column({ default: 'queued' })
  status!: 'queued' | 'processing' | 'completed' | 'failed';

  @Column({ name: 'extracted_text', type: 'text' })
  extractedText!: string;

  @Column({ name: 'total_pages', type: 'int' })
  totalPages!: number;

  @Column({ name: 'overall_score', nullable: true, type: 'int' })
  overallScore!: number | null;

  @Column({ nullable: true, type: 'jsonb' })
  feedback!: unknown;

  @Column({ name: 'suggested_keywords', nullable: true, type: 'jsonb' })
  suggestedKeywords!: string[] | null;

  @Column({ name: 'suggested_roles', nullable: true, type: 'jsonb' })
  suggestedRoles!: string[] | null;

  @Column({ name: 'suggested_jobs', nullable: true, type: 'jsonb' })
  suggestedJobs!: unknown;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
