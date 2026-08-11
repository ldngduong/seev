import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { SeniorityLevel } from '../../seniority/entities/seniority-level.entity';
import { JobPost } from './job-post.entity';

@Entity({ name: 'job_post_seniority_levels' })
@Index('IDX_job_post_seniority_level', ['seniorityLevelId', 'jobPostId'])
export class JobPostSeniorityLevel {
  @PrimaryColumn({ name: 'job_post_id', type: 'uuid' })
  jobPostId!: string;

  @ManyToOne(() => JobPost, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_post_id' })
  jobPost!: JobPost;

  @PrimaryColumn({ name: 'seniority_level_id', type: 'uuid' })
  seniorityLevelId!: string;

  @ManyToOne(() => SeniorityLevel, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'seniority_level_id' })
  seniorityLevel!: SeniorityLevel;

  @Column({ name: 'mapping_method', type: 'varchar' })
  mappingMethod!: string;

  @Column({ type: 'double precision' })
  confidence!: number;

  @Column({ default: () => "'{}'::jsonb", type: 'jsonb' })
  evidence!: Record<string, unknown>;

  @Column({ default: false, name: 'is_primary', type: 'boolean' })
  isPrimary!: boolean;
}
