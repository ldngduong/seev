import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'activity_logs' })
@Index('IDX_activity_logs_subject_created', ['subjectUserId', 'createdAt'])
@Index('IDX_activity_logs_actor_created', ['actorUserId', 'createdAt'])
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'subject_user_id', nullable: true, type: 'uuid' }) subjectUserId!: string | null;
  @Column({ name: 'actor_user_id', nullable: true, type: 'uuid' }) actorUserId!: string | null;
  @Column({ type: 'varchar' }) action!: string;
  @Column({ name: 'resource_type', nullable: true, type: 'varchar' }) resourceType!: string | null;
  @Column({ name: 'resource_id', nullable: true, type: 'varchar' }) resourceId!: string | null;
  @Column({ default: 'success', type: 'varchar' }) status!: 'success' | 'failed';
  @Column({ name: 'ip_address', nullable: true, type: 'varchar' }) ipAddress!: string | null;
  @Column({ name: 'user_agent', nullable: true, type: 'text' }) userAgent!: string | null;
  @Column({ default: () => "'{}'::jsonb", type: 'jsonb' }) metadata!: Record<string, unknown>;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}
