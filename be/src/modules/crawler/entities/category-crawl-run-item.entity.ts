import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'category_crawl_run_items' })
@Index('UQ_category_crawl_run_items_target', ['runId', 'source', 'crawlUrl'], { unique: true })
export class CategoryCrawlRunItem {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'run_id', type: 'uuid' }) runId!: string;
  @Column({ type: 'varchar' }) source!: string;
  @Column({ name: 'crawl_url', type: 'text' }) crawlUrl!: string;
  @Column({ name: 'category_ids', default: () => "'[]'::jsonb", type: 'jsonb' }) categoryIds!: string[];
  @Column({ name: 'category_names', type: 'varchar' }) categoryNames!: string;
  @Column({ default: 'queued', type: 'varchar' }) status!: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  @Column({ name: 'fetched_count', default: 0, type: 'int' }) fetchedCount!: number;
  @Column({ name: 'saved_count', default: 0, type: 'int' }) savedCount!: number;
  @Column({ name: 'duration_ms', nullable: true, type: 'int' }) durationMs!: number | null;
  @Column({ nullable: true, type: 'text' }) error!: string | null;
  @Column({ name: 'started_at', nullable: true, type: 'timestamptz' }) startedAt!: Date | null;
  @Column({ name: 'completed_at', nullable: true, type: 'timestamptz' }) completedAt!: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
