import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

import { JobFamilyCategoryEdge } from './job-family-category-edge.entity';

@Entity({ name: 'job_family_categories' })
export class JobFamilyCategory {
  @PrimaryColumn({ type: 'int' })
  id!: number;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'smallint' })
  level!: number;

  @Column({ unique: true, type: 'varchar' })
  alias!: string;

  @Column({ name: 'display_order', type: 'int' })
  displayOrder!: number;

  @Column({ name: 'search_text', type: 'varchar' })
  searchText!: string;

  @OneToMany(() => JobFamilyCategoryEdge, (edge) => edge.parent)
  childEdges!: JobFamilyCategoryEdge[];

  @OneToMany(() => JobFamilyCategoryEdge, (edge) => edge.child)
  parentEdges!: JobFamilyCategoryEdge[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
