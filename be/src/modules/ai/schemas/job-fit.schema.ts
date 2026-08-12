import { z } from 'zod';

const dimensionSchema = z.object({
  code: z.enum(['role_category', 'technical_skills', 'experience_scope', 'seniority', 'work_context']),
  score: z.number().min(0),
  max_score: z.number().positive(),
  rationale: z.string().min(1),
});

const evidenceSchema = z.object({
  requirement: z.string().min(1),
  status: z.enum(['met', 'partial', 'gap', 'unknown']),
  cv_evidence: z.array(z.string()).default([]),
  explanation: z.string().min(1),
});

export const jobFitResultSchema = z.object({
  verdict: z.enum(['very_good', 'good', 'consider', 'low']),
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1),
  dimensions: z.array(dimensionSchema).length(5),
  requirement_evidence: z.array(evidenceSchema).min(1),
  strengths: z.array(z.string()).default([]),
  gaps: z.array(z.string()).default([]),
  actions: z.array(z.string()).default([]),
});

export type JobFitResult = z.infer<typeof jobFitResultSchema>;
