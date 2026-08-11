import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';

import { JobCategory } from './job-category.entity';

@Entity({ name: 'job_category_groups' })
export class JobCategoryGroup {
  @PrimaryColumn({ type: 'varchar' })
  code!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ name: 'display_order', type: 'int' })
  displayOrder!: number;

  @Column({ default: true, name: 'is_active', type: 'boolean' })
  isActive!: boolean;

  @OneToMany(() => JobCategory, (category) => category.group)
  categories!: JobCategory[];
}
