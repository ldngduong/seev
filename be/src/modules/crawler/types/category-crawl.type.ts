export const CATEGORY_CRAWL_QUEUE = 'category-crawl';
export const CATEGORY_CRAWL_JOB = 'run-category-crawl';
export const EXPIRED_JOB_CLEANUP_JOB = 'cleanup-expired-jobs';

export interface CategoryCrawlJobData {
  runId?: string;
  scheduled?: boolean;
}
