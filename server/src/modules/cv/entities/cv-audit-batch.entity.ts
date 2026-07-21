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

import { CvAudit } from './cv-audit.entity';

@Entity({ name: 'cv_audit_batches' })
@Index(['auditId', 'batchIndex'], { unique: true })
export class CvAuditBatch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'audit_id', type: 'uuid' })
  auditId!: string;

  @ManyToOne(() => CvAudit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'audit_id' })
  audit!: CvAudit;

  @Column({ name: 'batch_index', type: 'int' })
  batchIndex!: number;

  @Column({ name: 'total_batches', type: 'int' })
  totalBatches!: number;

  @Column({ default: 'pending' })
  status!: 'pending' | 'processing' | 'completed' | 'failed';

  @Column({ name: 'source_line_ids', type: 'jsonb' })
  sourceLineIds!: string[];

  @Column({ nullable: true, type: 'jsonb' })
  result!: unknown | null;

  @Column({ nullable: true, type: 'text' })
  error!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
