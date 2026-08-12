import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

import { CategorySeniorityLevel } from './category-seniority-level.entity';
import { JobCategoryAlias } from './job-category-alias.entity';
import { JobCategoryGroup } from './job-category-group.entity';

@Entity({ name: 'job_categories' })
export class JobCategory {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ unique: true, type: 'varchar' })
  code!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ name: 'group_code', type: 'varchar' })
  groupCode!: string;

  @JoinColumn({ name: 'group_code' })
  @ManyToOne(() => JobCategoryGroup, (group) => group.categories, {
    onDelete: 'CASCADE',
  })
  group!: JobCategoryGroup;

  @Column({ nullable: true, type: 'text' })
  description!: string | null;

  @Column({ name: 'display_order', type: 'int' })
  displayOrder!: number;

  @Column({ default: true, name: 'is_active', type: 'boolean' })
  isActive!: boolean;

  @OneToMany(() => JobCategoryAlias, (alias) => alias.category)
  aliases!: JobCategoryAlias[];

  @OneToMany(() => CategorySeniorityLevel, (rule) => rule.category)
  seniorityRules!: CategorySeniorityLevel[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
