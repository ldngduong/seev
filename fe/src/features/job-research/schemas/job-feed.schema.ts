import { z } from 'zod'

const jobSourceSchema = z.enum(['topcv', 'vietnamworks', 'itviec'])

export const jobFeedItemSchema = z.object({
  id: z.string().uuid(),
  source: jobSourceSchema,
  sourceJobId: z.string(),
  sourceUrl: z.string().url(),
  title: z.string(),
  companyName: z.string().nullable(),
  salaryText: z.string().nullable(),
  jobType: z.string().nullable(),
  experience: z.string().nullable(),
  logo: z.string().nullable(),
  locations: z.array(z.string()),
  jobCategoryId: z.string().uuid(),
  jobCategoryName: z.string().nullable(),
  skills: z.array(z.string()),
  postedAt: z.string().nullable(),
  expiredAt: z.string(),
  detailReady: z.boolean(),
  seniorityLevels: z.array(
    z.object({
      id: z.string().uuid(),
      code: z.string(),
      displayName: z.string(),
    }),
  ),
})

export const jobFeedResponseSchema = z.object({
  items: z.array(jobFeedItemSchema),
  meta: z.object({
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    total_pages: z.number().int().nonnegative(),
  }),
})
