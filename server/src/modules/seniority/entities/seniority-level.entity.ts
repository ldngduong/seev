import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'seniority_levels' })
export class SeniorityLevel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, type: 'varchar' })
  code!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ name: 'display_name', type: 'varchar' })
  displayName!: string;

  @Column({ nullable: true, type: 'text' })
  description!: string | null;

  @Column({ name: 'display_order', type: 'int' })
  displayOrder!: number;

  @Column({ default: true, name: 'is_active', type: 'boolean' })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
