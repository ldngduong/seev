import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';

@Entity({ name: 'refresh_sessions' })
@Index('IDX_refresh_sessions_family_id', ['familyId'])
@Index('IDX_refresh_sessions_user_id', ['userId'])
export class RefreshSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'family_id', type: 'uuid' })
  familyId!: string;

  @Column({ name: 'token_hash', type: 'char', length: 64 })
  tokenHash!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'revoked_at', nullable: true, type: 'timestamptz' })
  revokedAt!: Date | null;

  @Column({ name: 'replaced_by_session_id', nullable: true, type: 'uuid' })
  replacedBySessionId!: string | null;

  @Column({ name: 'last_used_at', nullable: true, type: 'timestamptz' })
  lastUsedAt!: Date | null;

  @Column({ name: 'ip_address', nullable: true, type: 'varchar', length: 64 })
  ipAddress!: string | null;

  @Column({ name: 'user_agent', nullable: true, type: 'text' })
  userAgent!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
