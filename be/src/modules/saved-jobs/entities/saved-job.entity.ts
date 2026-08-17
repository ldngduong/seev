import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { JobPost } from '../../crawler/entities/job-post.entity';

@Entity({ name: 'saved_jobs' })
@Index('IDX_saved_jobs_user_created', ['userId', 'createdAt'])
export class SavedJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'job_post_id', type: 'uuid' })
  jobPostId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => JobPost, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_post_id' })
  job!: JobPost;
}