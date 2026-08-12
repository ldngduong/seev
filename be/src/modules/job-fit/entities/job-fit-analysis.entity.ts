import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type JobFitStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type JobFitPhase = 'queued' | 'validating' | 'analyzing' | 'completed' | 'failed';

@Entity({ name: 'job_fit_analyses' })
@Index('IDX_job_fit_user_created', ['userId', 'createdAt'])
@Index('IDX_job_fit_cache', ['userCvId', 'jobPostId', 'cvContentHash', 'jobDetailHash', 'scoringVersion'])
export class JobFitAnalysis {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @Column({ name: 'user_cv_id', type: 'uuid' }) userCvId!: string;
  @Column({ name: 'job_post_id', nullable: true, type: 'uuid' }) jobPostId!: string | null;
  @Column({ name: 'cv_content_hash', type: 'varchar' }) cvContentHash!: string;
  @Column({ name: 'job_detail_hash', type: 'varchar' }) jobDetailHash!: string;
  @Column({ name: 'scoring_version', type: 'int', default: 1 }) scoringVersion!: number;
  @Column({ type: 'varchar', default: 'queued' }) status!: JobFitStatus;
  @Column({ type: 'varchar', default: 'queued' }) phase!: JobFitPhase;
  @Column({ type: 'smallint', default: 0 }) progress!: number;
  @Column({ name: 'progress_message', nullable: true, type: 'varchar' }) progressMessage!: string | null;
  @Column({ type: 'int', default: 1 }) attempt!: number;
  @Column({ nullable: true, type: 'smallint' }) score!: number | null;
  @Column({ nullable: true, type: 'varchar' }) verdict!: string | null;
  @Column({ nullable: true, type: 'double precision' }) confidence!: number | null;
  @Column({ nullable: true, type: 'jsonb' }) result!: Record<string, unknown> | null;
  @Column({ name: 'job_snapshot', type: 'jsonb' }) jobSnapshot!: Record<string, unknown>;
  @Column({ nullable: true, type: 'text' }) error!: string | null;
  @Column({ name: 'started_at', nullable: true, type: 'timestamptz' }) startedAt!: Date | null;
  @Column({ name: 'completed_at', nullable: true, type: 'timestamptz' }) completedAt!: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
