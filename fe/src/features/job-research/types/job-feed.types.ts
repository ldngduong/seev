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
  location?: string
  categoryId?: string
  groupCode?: string
  seniorityLevelId?: string
}
