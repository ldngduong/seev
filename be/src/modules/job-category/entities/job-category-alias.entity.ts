import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { JobCategory } from './job-category.entity';

@Entity({ name: 'job_category_aliases' })
export class JobCategoryAlias {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId!: string;

  @JoinColumn({ name: 'category_id' })
  @ManyToOne(() => JobCategory, (category) => category.aliases, {
    onDelete: 'CASCADE',
  })
  category!: JobCategory;

  @Column({ type: 'varchar' })
  alias!: string;

  @Column({ name: 'normalized_alias', type: 'varchar' })
  normalizedAlias!: string;

  @Column({ default: 'title', name: 'alias_type', type: 'varchar' })
  aliasType!: 'title' | 'skill' | 'source_label';

  @Column({ default: 1, type: 'double precision' })
  weight!: number;
}
