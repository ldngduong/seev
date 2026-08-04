import { z } from 'zod';

const feedbackSchema = z.object({
  id: z.string().optional().default(''),
  source_line_id: z.string().min(1),
  section: z.string().min(1),
  original_text: z.string().trim().min(8),
  highlight_text: z.string().optional().default(''),
  severity: z.enum(['info', 'warning', 'critical']).default('warning'),
  issue: z.string().min(1),
  suggestion: z.string().trim().min(1),
  suggestion_mode: z.enum(['direct_rewrite', 'conditional_recommendation']),
  evidence_source_line_ids: z.array(z.string().min(1)).min(1),
  highlight_color: z.enum(['yellow', 'red']).optional().default('yellow'),
});

const normalizedFeedbackSchema = feedbackSchema.extend({
  suggestion: z.string(),
});

const generalFeedbackSchema = z.object({
  id: z.string().optional().default(''),
  topic: z.string().min(1),
  severity: z.enum(['info', 'warning', 'critical']).default('warning'),
  comment: z.string().min(1),
  recommendation: z.string().optional().default(''),
});

const normalizedGeneralFeedbackSchema = generalFeedbackSchema.extend({
  recommendation: z.string(),
});

const suggestedJobSchema = z.object({
  title: z.string().optional().default(''),
  reason: z.string().optional().default('Phù hợp với mục tiêu đã chọn.'),
  match_level: z
    .enum(['high', 'medium', 'stretch'])
    .optional()
    .default('stretch'),
});

const scoreBreakdownSchema = z.object({
  dimension: z.string().min(1),
  score: z.number().int().min(0),
  max_score: z.number().int().min(1),
  rationale: z.string().min(1),
});

export const rawCvAuditResultSchema = z.object({
  overall_score: z.number().int().min(0).max(100),
  summary: z.string().min(1),
  score_breakdown: z.array(scoreBreakdownSchema).default([]),
  general_feedbacks: z.array(generalFeedbackSchema).default([]),
  detailed_feedbacks: z.array(feedbackSchema).min(1),
  suggested_keywords: z.array(z.string().min(1)).default([]),
  suggested_roles: z.array(z.string().min(1)).default([]),
  suggested_jobs: z.array(suggestedJobSchema).default([]),
});

export const generalCvAuditResultSchema = z.object({
  overall_score: z.number().int().min(0).max(100),
  summary: z.string().min(1),
  score_breakdown: z.array(scoreBreakdownSchema).min(3).max(8),
  general_feedbacks: z.array(generalFeedbackSchema).default([]),
  suggested_keywords: z.array(z.string().min(1)).min(3).max(20),
  suggested_roles: z.array(z.string().min(1)).min(3).max(10),
  suggested_jobs: z.array(suggestedJobSchema).min(3).max(10),
});

export const lineCvAuditResultSchema = z.object({
  reviewed_source_line_ids: z.array(z.string().min(1)).min(1),
  detailed_feedbacks: z.array(feedbackSchema).default([]),
});

export const cvAuditResultSchema = z.object({
  overall_score: z.number().int().min(0).max(100),
  summary: z.string().min(1),
  score_breakdown: z.array(scoreBreakdownSchema).default([]),
  general_feedbacks: z.array(normalizedGeneralFeedbackSchema).default([]),
  detailed_feedbacks: z.array(normalizedFeedbackSchema).default([]),
  suggested_keywords: z.array(z.string().min(1)).min(3).max(20),
  suggested_roles: z.array(z.string().min(1)).min(3).max(10),
  suggested_jobs: z.array(suggestedJobSchema).min(3).max(10),
});

export type CvAuditResult = z.infer<typeof cvAuditResultSchema>;

export const cvTargetInferenceSchema = z.object({
  target_role: z.string().min(1),
  target_category_hint: z.string().optional().default(''),
  seniority_hint: z.string().optional().default(''),
  confidence: z.number().min(0).max(1).default(0.5),
  reasoning: z.string().min(1),
  keywords: z.array(z.string().min(1)).min(3).max(20),
  search_queries: z.array(z.string().min(2)).min(2).max(8),
});

export type CvTargetInference = z.infer<typeof cvTargetInferenceSchema>;
