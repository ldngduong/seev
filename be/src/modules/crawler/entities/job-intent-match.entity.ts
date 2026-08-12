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

import { JobPost } from './job-post.entity';
import { JobSearchIntent } from './job-search-intent.entity';

@Entity({ name: 'job_intent_matches' })
@Index('UQ_job_intent_matches_intent_job', ['intentId', 'jobPostId'], {
  unique: true,
})
export class JobIntentMatch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'intent_id', type: 'uuid' })
  intentId!: string;

  @JoinColumn({ name: 'intent_id' })
  @ManyToOne(() => JobSearchIntent, { onDelete: 'CASCADE' })
  intent!: JobSearchIntent;

  @Column({ name: 'job_post_id', type: 'uuid' })
  jobPostId!: string;

  @JoinColumn({ name: 'job_post_id' })
  @ManyToOne(() => JobPost, { onDelete: 'CASCADE' })
  jobPost!: JobPost;

  @Column({ name: 'match_score', default: 0, type: 'int' })
  matchScore!: number;

  @Column({
    name: 'matched_terms',
    default: () => "'[]'::jsonb",
    type: 'jsonb',
  })
  matchedTerms!: string[];

  @Column({ name: 'match_kind', default: 'match', type: 'varchar', length: 16 })
  matchKind!: 'match' | 'suggestion' | 'reject';

  @Column({
    name: 'match_reason',
    default: '',
    type: 'text',
  })
  matchReason!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
