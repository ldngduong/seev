import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'cv_audits' })
export class CvAudit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

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
