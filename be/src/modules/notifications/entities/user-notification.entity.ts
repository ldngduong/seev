import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type NotificationStatus = 'running' | 'completed' | 'failed';
export type NotificationResourceType = 'cv_research_session';

@Entity({ name: 'user_notifications' })
@Index('IDX_user_notifications_user_created', ['userId', 'createdAt'])
@Index(
  'UQ_user_notifications_resource',
  ['userId', 'resourceType', 'resourceId'],
  { unique: true },
)
export class UserNotification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'resource_type', type: 'varchar' })
  resourceType!: NotificationResourceType;

  @Column({ name: 'resource_id', type: 'uuid' })
  resourceId!: string;

  @Column({ type: 'varchar' })
  status!: NotificationStatus;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'varchar' })
  message!: string;

  @Column({ type: 'varchar' })
  href!: string;

  @Column({ name: 'read_at', nullable: true, type: 'timestamp' })
  readAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
