import type { z } from 'zod'

import type {
  jobFeedItemSchema,
  jobFeedResponseSchema,
} from '../schemas/job-feed.schema'

export type JobFeedItem = z.infer<typeof jobFeedItemSchema>
export type JobFeedResponse = z.infer<typeof jobFeedResponseSchema>

export interface JobFeedQuery {
  page?: number
  pageSize?: number
  search?: string
  categoryId?: string
  seniorityLevelId?: string
}
