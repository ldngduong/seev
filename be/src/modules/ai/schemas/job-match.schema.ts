import { z } from 'zod';

export const JOB_LEVELS = [
  'intern',
  'fresher',
  'junior',
  'middle',
  'senior',
  'staff',
  'principal',
  'tech_lead',
  'manager',
  'head_director',
] as const;

export const MATCH_KINDS = ['match', 'suggestion', 'reject'] as const;

export const jobLevelSchema = z.enum(JOB_LEVELS);

export const matchKindSchema = z.enum(MATCH_KINDS);

export const jobMatchResultSchema = z.object({
  job_id: z.string().min(1),
  level: jobLevelSchema.nullable(),
  match_kind: matchKindSchema,
  score: z.number().int().min(0).max(100),
  reason: z.string().min(1),
});

export const jobMatchBatchSchema = z.object({
  matches: z.array(jobMatchResultSchema),
});

export type JobMatchResult = z.infer<typeof jobMatchResultSchema>;
