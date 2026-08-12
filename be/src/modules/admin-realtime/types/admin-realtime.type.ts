export const ADMIN_CRAWL_PROGRESS_EVENT = 'crawl:progress';

export interface AdminCrawlProgressEvent {
  run_id: string;
  status: string;
  phase: string;
  progress: number;
  message: string | null;
  total_targets: number;
  completed_targets: number;
  failed_targets: number;
  total_jobs: number;
  saved_jobs: number;
  current_source: string | null;
  current_category: string | null;
  cancel_requested: boolean;
  updated_at: Date;
}
