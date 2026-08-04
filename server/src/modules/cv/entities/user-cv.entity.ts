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

import { User } from '../../users/entities/user.entity';
import type { ResumeTextLine } from '../interfaces/parsed-resume.interface';

@Entity({ name: 'user_cvs' })
@Index('IDX_user_cvs_user_created', ['userId', 'createdAt'])
export class UserCv {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @JoinColumn({ name: 'user_id' })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ name: 'original_file_name', type: 'varchar' })
  originalFileName!: string;

  @Column({ name: 'mime_type', type: 'varchar' })
  mimeType!: string;

  @Column({ name: 'size_bytes', type: 'int' })
  sizeBytes!: number;

  @Column({ name: 'content_hash', type: 'varchar' })
  contentHash!: string;

  @Column({ name: 'storage_provider', type: 'varchar' })
  storageProvider!: 'cloudflare_r2';

  @Column({ name: 'storage_bucket', type: 'varchar' })
  storageBucket!: string;

  @Column({ name: 'storage_key', type: 'text' })
  storageKey!: string;

  @Column({ name: 'storage_etag', nullable: true, type: 'varchar' })
  storageEtag!: string | null;

  @Column({ default: 'ready', type: 'varchar' })
  status!: 'processing' | 'ready' | 'failed';

  @Column({ name: 'extracted_text', type: 'text' })
  extractedText!: string;

  @Column({ name: 'parsed_lines', default: () => "'[]'::jsonb", type: 'jsonb' })
  parsedLines!: ResumeTextLine[];

  @Column({ name: 'total_pages', type: 'int' })
  totalPages!: number;

  @Column({ name: 'parser_version', type: 'int', default: 1 })
  parserVersion!: number;

  @Column({ nullable: true, type: 'text' })
  error!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
