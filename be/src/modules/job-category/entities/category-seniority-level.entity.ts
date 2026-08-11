import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { SeniorityLevel } from '../../seniority/entities/seniority-level.entity';
import { JobCategory } from './job-category.entity';

@Entity({ name: 'category_seniority_levels' })
export class CategorySeniorityLevel {
  @PrimaryColumn({ name: 'category_id', type: 'uuid' })
  categoryId!: string;

  @PrimaryColumn({ name: 'seniority_code', type: 'varchar' })
  seniorityCode!: string;

  @JoinColumn({ name: 'category_id' })
  @ManyToOne(() => JobCategory, (category) => category.seniorityRules, {
    onDelete: 'CASCADE',
  })
  category!: JobCategory;

  @JoinColumn({ name: 'seniority_code', referencedColumnName: 'code' })
  @ManyToOne(() => SeniorityLevel, { onDelete: 'CASCADE' })
  seniority!: SeniorityLevel;

  @Column({ default: true, name: 'is_selectable', type: 'boolean' })
  isSelectable!: boolean;

  @Column({
    name: 'experience_min_override',
    nullable: true,
    type: 'double precision',
  })
  experienceMinOverride!: number | null;

  @Column({
    name: 'experience_max_override',
    nullable: true,
    type: 'double precision',
  })
  experienceMaxOverride!: number | null;
}
