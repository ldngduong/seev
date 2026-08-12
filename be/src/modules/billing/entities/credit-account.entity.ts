import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryColumn, UpdateDateColumn, VersionColumn } from 'typeorm';

import { User } from '../../users/entities/user.entity';

@Entity({ name: 'credit_accounts' })
export class CreditAccount {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' }) userId!: string;
  @JoinColumn({ name: 'user_id' }) @OneToOne(() => User, { onDelete: 'CASCADE' }) user!: User;
  @Column({ default: '0', type: 'bigint' }) balance!: string;
  @VersionColumn() version!: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
