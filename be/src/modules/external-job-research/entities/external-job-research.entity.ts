import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type ExternalJobResearchSource = 'jd' | 'link';
export type ExternalJobResearchInput = 'text' | 'pdf' | 'word' | 'txt' | 'url';
export type ExternalJobResearchStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type ExternalJobResearchPhase = 'queued' | 'reading' | 'validating' | 'analyzing' | 'completed' | 'failed';

@Entity({ name: 'external_job_researches' })
@Index('IDX_external_job_research_user_created', ['userId', 'createdAt'])
export class ExternalJobResearch {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @Column({ name: 'user_cv_id', type: 'uuid' }) userCvId!: string;
  @Column({ name: 'cv_content_hash', type: 'varchar' }) cvContentHash!: string;
  @Column({ name: 'source_kind', type: 'varchar' }) sourceKind!: ExternalJobResearchSource;
  @Column({ name: 'input_kind', type: 'varchar' }) inputKind!: ExternalJobResearchInput;
  @Column({ type: 'varchar', default: 'queued' }) status!: ExternalJobResearchStatus;
  @Column({ type: 'varchar', default: 'queued' }) phase!: ExternalJobResearchPhase;
  @Column({ type: 'smallint', default: 0 }) progress!: number;
  @Column({ name: 'progress_message', nullable: true, type: 'varchar' }) progressMessage!: string | null;
  @Column({ type: 'int', default: 1 }) attempt!: number;
  @Column({ nullable: true, type: 'smallint' }) score!: number | null;
  @Column({ nullable: true, type: 'varchar' }) verdict!: string | null;
  @Column({ nullable: true, type: 'double precision' }) confidence!: number | null;
  @Column({ nullable: true, type: 'jsonb' }) result!: Record<string, unknown> | null;
  @Column({ nullable: true, type: 'text' }) error!: string | null;
  @Column({ name: 'failure_origin', nullable: true, type: 'varchar' }) failureOrigin!: 'user_input' | 'system' | null;
  @Column({ name: 'started_at', nullable: true, type: 'timestamptz' }) startedAt!: Date | null;
  @Column({ name: 'completed_at', nullable: true, type: 'timestamptz' }) completedAt!: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
