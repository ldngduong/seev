export const CATEGORY_CRAWL_QUEUE = 'category-crawl';
export const CATEGORY_CRAWL_JOB = 'run-category-crawl';

export interface CategoryCrawlJobData {
  runId?: string;
  scheduled?: boolean;
}
