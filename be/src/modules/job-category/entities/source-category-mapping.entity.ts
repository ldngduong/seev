import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'source_category_mappings' })
export class SourceCategoryMapping {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'varchar' })
  source!: string;

  @Column({ name: 'external_key', type: 'varchar' })
  externalKey!: string;

  @Column({ name: 'external_name', nullable: true, type: 'varchar' })
  externalName!: string | null;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId!: string;

  @Column({ name: 'crawl_url', type: 'text' })
  crawlUrl!: string;

  @Column({ default: true, name: 'is_active', type: 'boolean' })
  isActive!: boolean;

  @Column({
    default: () => "'{}'::jsonb",
    name: 'filter_payload',
    type: 'jsonb',
  })
  filterPayload!: Record<string, unknown>;
}
