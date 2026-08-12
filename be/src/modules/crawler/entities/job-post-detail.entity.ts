import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import { JobPost } from './job-post.entity';

@Entity({ name: 'job_post_details' })
export class JobPostDetail {
  @PrimaryColumn({ name: 'job_post_id', type: 'uuid' }) jobPostId!: string;
  @JoinColumn({ name: 'job_post_id' })
  @OneToOne(() => JobPost, { onDelete: 'CASCADE' }) jobPost!: JobPost;
  @Column({ type: 'text' }) description!: string;
  @Column({ type: 'text' }) requirements!: string;
  @Column({ name: 'content_hash', type: 'varchar', length: 32 }) contentHash!: string;
  @Column({ name: 'source_evidence', type: 'jsonb', default: () => "'{}'::jsonb" }) sourceEvidence!: Record<string, unknown>;
  @Column({ name: 'parser_version', type: 'int' }) parserVersion!: number;
  @Column({ name: 'quality_score', type: 'double precision' }) qualityScore!: number;
  @Column({ name: 'fetched_at', type: 'timestamptz' }) fetchedAt!: Date;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
