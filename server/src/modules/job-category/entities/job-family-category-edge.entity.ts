import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { JobFamilyCategory } from './job-family-category.entity';

@Entity({ name: 'job_family_category_edges' })
export class JobFamilyCategoryEdge {
  @PrimaryColumn({ name: 'parent_id', type: 'int' })
  parentId!: number;

  @PrimaryColumn({ name: 'child_id', type: 'int' })
  childId!: number;

  @Column({ name: 'position', type: 'int' })
  position!: number;

  @ManyToOne(() => JobFamilyCategory, (category) => category.childEdges, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parent_id' })
  parent!: JobFamilyCategory;

  @ManyToOne(() => JobFamilyCategory, (category) => category.parentEdges, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'child_id' })
  child!: JobFamilyCategory;
}
