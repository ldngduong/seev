import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';
import { ZodError } from 'zod';

import type { Env } from '../../config/env.schema';
import { runWithConcurrency } from '../../shared/utils/run-with-concurrency';
import type { CandidateHighlight } from '../cv/interfaces/parsed-resume.interface';
import {
  cvAuditResultSchema,
  cvTargetInferenceSchema,
  generalCvAuditResultSchema,
  lineCvAuditResultSchema,
  rawCvAuditResultSchema,
  type CvAuditResult,
  type CvTargetInference,
} from './schemas/cv-audit-result.schema';
import {
  jobMatchBatchSchema,
  type JobMatchResult,
} from './schemas/job-match.schema';
import { buildAuditUnits } from './utils/audit-unit-builder';
import { jobFitResultSchema, type JobFitResult } from './schemas/job-fit.schema';
import { isNeutralCvLinkOrContactLine } from '../cv/utils/cv-line-classifier';

interface AnalyzeCvInput {
  target: {
    targetRole: string | null;
    jobCategoryId: string | null;
    jobCategoryName: string | null;
    seniorityLevelId: string | null;
    seniorityLevelName: string | null;
    seniorityDescription: string | null;
    jobDescription?: string | null;
  };
  resumeText: string;
  candidateHighlights: CandidateHighlight[];
  onLineBatchStart?: (event: LineBatchEvent) => Promise<void>;
  onLineBatchComplete?: (
    event: LineBatchEvent & {
      completedBatches: number;
      result: ReturnType<typeof lineCvAuditResultSchema.parse>;
    },
  ) => Promise<void>;
  onLineBatchFailed?: (
    event: LineBatchEvent & { error: unknown },
  ) => Promise<void>;
  onCoverageStart?: (event: AuditPlanEvent) => Promise<void>;
  onCoverageBatchComplete?: (
    event: AuditPlanEvent & { completedBatches: number },
  ) => Promise<void>;
  onFinalSynthesisStart?: () => Promise<void>;
}

interface LineBatchEvent {
  batchIndex: number;
  totalBatches: number;
  batch: CandidateHighlight[];
}

interface AuditPlanEvent {
  totalBatches: number;
}

const LINE_AUDIT_CONTEXT_OVERLAP = 3;
const CV_AUDIT_LINK_AND_DISPLAY_RULES = [
  '- Source-line identifiers such as hl_023 are internal machine references. Never mention, quote, explain, or expose any hl_* identifier in section, issue, suggestion, summary, rationale, comment, recommendation, keyword, role, job title, or job reason.',
  '- GitHub, GitLab, LinkedIn, portfolio, personal website, live demo, email, phone, and other contact/link lines are neutral metadata and valid evidence links. Do not create line-level feedback asking the candidate to rewrite, remove, relabel, or reposition them.',
  '- A personal website, portfolio, or live demo is not a role claim and must not be judged as conflicting with the selected career target.',
  '- PDF extraction can place independent links near one another or expose them in surrounding context. Never claim that one URL is duplicated, appended to another URL, or placed under the wrong label based on surrounding lines. Context lines are separate evidence units, not continuations of the candidate line.',
];

@Injectable()
export class AiEngineService {
  private client: OpenAI | null = null;

  constructor(private readonly configService: ConfigService<Env, true>) {}

  /**
   * AI job-match classification: each crawled job is judged against the CV
   * target using canonical category/seniority evidence plus the source title
   * and skills. Deterministic compatibility is enforced by the caller.
   */
  async classifyJobMatches(input: {
    target: {
      targetRole: string | null;
      seniorityLevelName: string | null;
      keywords: string[];
    };
    jobs: Array<{
      jobId: string;
      title: string;
      categoryName: string | null;
      seniorityCode: string | null;
      skills: string[];
    }>;
  }): Promise<JobMatchResult[]> {
    if (input.jobs.length === 0) {
      return [];
    }

    const client = this.getClient();
    const maxPerCall = 120;
    const results: JobMatchResult[] = [];

    for (let index = 0; index < input.jobs.length; index += maxPerCall) {
      const batch = input.jobs.slice(index, index + maxPerCall);
      results.push(
        ...(await this.requestJobMatchBatch(client, input.target, batch)),
      );
    }

    return results;
  }

  async analyzeJobFit(input: {
    resumeText: string;
    job: {
      title: string;
      categoryName: string | null;
      seniorityNames: string[];
      locations: string[];
      jobType: string | null;
      skills: string[];
      description: string;
      requirements: string;
    };
  }): Promise<JobFitResult> {
    const client = this.getClient();
    const model = this.configService.get('DEEPSEEK_MODEL', { infer: true });
    const content = await this.requestAuditJson(client, {
      model,
      stream: false,
      reasoning_effort: 'high',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'Bạn là chuyên gia tuyển dụng CNTT. Chỉ trả về JSON hợp lệ, không dùng markdown. Mọi nội dung giải thích phải bằng tiếng Việt.',
        },
        {
          role: 'user',
          content: [
            'Đánh giá mức độ phù hợp giữa CV và một việc làm cụ thể.',
            'Không được suy diễn ứng viên có kỹ năng hoặc kinh nghiệm không xuất hiện trong CV.',
            'Chỉ dùng mô tả và yêu cầu do nhà tuyển dụng cung cấp bên dưới; bỏ qua phúc lợi, quảng cáo công ty và nội dung liên quan khác.',
            'Với mỗi yêu cầu quan trọng, phải trích nguyên văn bằng chứng ngắn từ CV. Nếu không có bằng chứng, dùng status gap hoặc unknown và để cv_evidence rỗng.',
            'Không viết “ứng viên không có”; hãy viết “CV chưa thể hiện”.',
            'Chấm đúng năm chiều và đúng trọng số: role_category 20, technical_skills 30, experience_scope 25, seniority 20, work_context 5.',
            'Điểm từng chiều phải nằm trong [0,max_score]. Không tự cộng tổng điểm trong JSON.',
            'verdict: very_good nếu bằng chứng rất mạnh; good nếu phù hợp phần lớn; consider nếu còn khoảng trống đáng kể; low nếu lệch vai trò/yêu cầu cốt lõi.',
            '',
            'Trả đúng cấu trúc JSON:',
            JSON.stringify({
              verdict: 'good', confidence: 0.85, summary: 'Nhận định ngắn bằng tiếng Việt.',
              dimensions: [
                { code: 'role_category', score: 16, max_score: 20, rationale: '...' },
                { code: 'technical_skills', score: 23, max_score: 30, rationale: '...' },
                { code: 'experience_scope', score: 18, max_score: 25, rationale: '...' },
                { code: 'seniority', score: 15, max_score: 20, rationale: '...' },
                { code: 'work_context', score: 4, max_score: 5, rationale: '...' },
              ],
              requirement_evidence: [{ requirement: 'Yêu cầu gốc', status: 'met', cv_evidence: ['Bằng chứng nguyên văn từ CV'], explanation: '...' }],
              strengths: ['...'], gaps: ['...'], actions: ['...'],
            }),
            '',
            'Việc làm:',
            JSON.stringify(input.job, null, 2),
            '',
            'Nội dung CV:',
            input.resumeText.slice(0, 18000),
          ].join('\n'),
        },
      ],
      thinking: { type: 'enabled' },
    } as ChatCompletionCreateParamsNonStreaming);
    const result = jobFitResultSchema.parse(this.parseJsonContent(content));
    const expectedWeights = new Map([
      ['role_category', 20], ['technical_skills', 30], ['experience_scope', 25], ['seniority', 20], ['work_context', 5],
    ]);
    if (new Set(result.dimensions.map((item) => item.code)).size !== 5 || result.dimensions.some((item) => item.max_score !== expectedWeights.get(item.code) || item.score > item.max_score)) {
      throw new BadGatewayException('AI trả cấu trúc điểm job match không hợp lệ.');
    }
    return result;
  }

  async inferCvTarget(input: {
    resumeText: string;
    headerLines: string[];
    categories: Array<{
      code: string;
      name: string;
      description: string | null;
      aliases: string[];
      allowedSeniorityCodes: string[];
    }>;
    seniorityLevels: Array<{
      code: string;
      name: string;
      description: string | null;
      experienceMin: number | null;
      experienceMax: number | null;
    }>;
  }): Promise<CvTargetInference> {
    const client = this.getClient();
    const model = this.configService.get('DEEPSEEK_MODEL', { infer: true });
    const content = await this.requestAuditJson(client, {
      model,
      stream: false,
      reasoning_effort: 'high',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a senior recruiter. Return only valid JSON. Do not use markdown.',
        },
        {
          role: 'user',
          content: [
            'Infer the most appropriate job target for this CV.',
            'Priority:',
            '1. If the CV header, title, objective, profile summary, or repeated project role states an explicit job title, use that specific candidate-facing job title as target_role.',
            '2. Do not replace a specific job title with a broader degree, major, or category. Education and majors are context unless the CV has no job title or career direction.',
            '3. If no explicit job title exists, infer the strongest job direction from summary, skills, projects, and experience.',
            '4. Do not invent a target that is unsupported by the CV.',
            '5. Select exactly one target_category_code from the canonical database category catalog below. Never invent, translate, shorten, or combine category codes. If the CV has no credible IT direction represented by the catalog, return "unsupported".',
            '6. target_category_hint must be the exact name belonging to the selected target_category_code. target_role must stay as the specific candidate-facing job title.',
            '7. The output language for target_role can follow the CV language.',
            '8. PDF extraction may letter-space header titles. If a top-line title is split into individual characters or unusual spacing, infer the normal phrase from that line instead of ignoring it.',
            '9. Preserve occupation wording from evidence. Do not transform a person/job title into a broader field noun unless the CV itself uses that broader wording.',
            '10. Select seniority_code from the canonical seniority catalog when the CV provides enough evidence; otherwise return null. The code must also appear in allowedSeniorityCodes of the selected category. seniority_hint must be the exact catalog name for that code, or empty when seniority_code is null.',
            '11. search_queries are occupation-title aliases used to match existing jobs in the database, not live-crawl queries, skill keywords, or display text. Return concise titles that employers genuinely use for the same occupation, including Vietnamese/English equivalents when supported. Keep seniority separate. Never return tools, technologies, generic industries, degrees, or isolated skills as search queries.',
            '12. Do not rewrite a precise occupation title into a broader field noun, degree, major, or generic category. Preserve the explicit specialization and seniority when the CV provides them.',
            '',
            'Canonical database category catalog:',
            JSON.stringify(input.categories, null, 2),
            '',
            'Canonical database seniority catalog:',
            JSON.stringify(input.seniorityLevels, null, 2),
            '',
            'Return this exact JSON shape:',
            JSON.stringify({
              target_role: 'candidate-facing job title inferred from the CV',
              target_category_code: 'exact.code.from.catalog',
              target_category_hint:
                'exact category name belonging to target_category_code',
              seniority_code: 'exact_code_from_catalog_or_null',
              seniority_hint:
                'exact seniority name belonging to seniority_code, or empty',
              confidence: 0.8,
              reasoning:
                'Giải thích bằng tiếng Việt dựa trên bằng chứng trong CV.',
              keywords: [
                'relevant keyword 1',
                'relevant keyword 2',
                'relevant keyword 3',
              ],
              search_queries: [
                'primary searchable occupation title',
                'common equivalent occupation title',
                'localized occupation-title alias',
              ],
            }),
            '',
            'Header / top CV lines, highest priority:',
            JSON.stringify(input.headerLines.slice(0, 20), null, 2),
            '',
            'CV text:',
            input.resumeText.slice(0, 12000),
          ].join('\n'),
        },
      ],
    });

    return cvTargetInferenceSchema.parse(this.parseJsonContent(content));
  }

  async analyzeCv(input: AnalyzeCvInput): Promise<CvAuditResult> {
    const client = this.getClient();
    const lineResults = await this.requestLineAudits(client, input);
    const firstPassFeedbacks = this.dedupeLineFeedbacks(
      lineResults.flatMap((result) => result.detailed_feedbacks),
    );
    const coverageResults = await this.requestCoverageAudits(
      client,
      input,
      firstPassFeedbacks,
    );
    const detailedFeedbacks = this.dedupeLineFeedbacks([
      ...firstPassFeedbacks,
      ...coverageResults.flatMap((result) => result.detailed_feedbacks),
    ]);
    await input.onFinalSynthesisStart?.();
    const generalResult = await this.requestFinalAudit(
      client,
      input,
      detailedFeedbacks,
    );
    const mergedResult = {
      ...generalResult,
      detailed_feedbacks: detailedFeedbacks,
    };

    this.validateFeedbackAnchors(mergedResult, input.candidateHighlights);
    const anchoredResult = this.attachHighlightText(
      mergedResult,
      input.candidateHighlights,
    );

    return cvAuditResultSchema.parse(this.normalizeAuditResult(anchoredResult));
  }

  private async requestFinalAudit(
    client: OpenAI,
    input: AnalyzeCvInput,
    detailedFeedbacks: ReturnType<
      typeof lineCvAuditResultSchema.parse
    >['detailed_feedbacks'],
  ) {
    let content = await this.requestAuditJson(
      client,
      this.createFinalAuditRequest(input, detailedFeedbacks),
    );
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const result = generalCvAuditResultSchema.parse(
          this.parseJsonContent(content),
        );
        this.validateScoreBreakdown(result);
        this.validateFinalAuditLanguage(result);
        return result;
      } catch (error) {
        lastError = error;

        if (attempt === 2) {
          break;
        }

        content = await this.requestAuditJson(
          client,
          this.createFinalRepairRequest(
            input,
            detailedFeedbacks,
            content,
            error,
            attempt + 1,
          ),
        );
      }
    }

    throw new BadGatewayException({
      message:
        'Phản hồi DeepSeek không khớp schema audit CV cuối cùng sau khi sửa.',
      cause: this.formatValidationError(lastError),
    });
  }

  private async requestLineAudits(client: OpenAI, input: AnalyzeCvInput) {
    const batches = this.buildLineAuditUnits(input.candidateHighlights);
    let completedBatches = 0;

    return runWithConcurrency(
      batches,
      this.getAuditConcurrency(),
      async (batch, index) => {
        const result = await this.requestLineAudit(
          client,
          input,
          batch,
          this.getLineContext(input.candidateHighlights, batch),
          index + 1,
          batches.length,
        );
        completedBatches += 1;
        await input.onLineBatchComplete?.({
          batchIndex: index,
          totalBatches: batches.length,
          batch,
          completedBatches,
          result,
        });
        return result;
      },
    );
  }

  private async requestCoverageAudits(
    client: OpenAI,
    input: AnalyzeCvInput,
    existingFeedbacks: ReturnType<
      typeof lineCvAuditResultSchema.parse
    >['detailed_feedbacks'],
  ) {
    const flaggedLineIds = new Set(
      existingFeedbacks.map((feedback) => feedback.source_line_id),
    );
    const unreviewedHighlights = input.candidateHighlights.filter(
      (highlight) => !flaggedLineIds.has(highlight.id),
    );

    if (unreviewedHighlights.length === 0) {
      await input.onCoverageStart?.({ totalBatches: 0 });
      return [];
    }

    const batches = this.buildCoverageAuditUnits(unreviewedHighlights);
    let completedBatches = 0;

    await input.onCoverageStart?.({ totalBatches: batches.length });

    return runWithConcurrency(
      batches,
      this.getAuditConcurrency(),
      async (batch) => {
        const result = await this.requestCoverageAudit(
          client,
          input,
          batch,
          this.getLineContext(input.candidateHighlights, batch),
          existingFeedbacks,
        );
        completedBatches += 1;
        await input.onCoverageBatchComplete?.({
          totalBatches: batches.length,
          completedBatches,
        });
        return result;
      },
    );
  }

  private parseJsonContent(content: string) {
    const normalized = content
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '');

    return JSON.parse(normalized);
  }

  private buildLineAuditUnits(candidateHighlights: CandidateHighlight[]) {
    return buildAuditUnits(candidateHighlights, {
      targetCharacters: this.configService.get(
        'CV_AUDIT_BATCH_TARGET_CHARACTERS',
        { infer: true },
      ),
      maxLines: this.configService.get('CV_AUDIT_BATCH_MAX_LINES', {
        infer: true,
      }),
    });
  }

  private buildCoverageAuditUnits(candidateHighlights: CandidateHighlight[]) {
    return buildAuditUnits(candidateHighlights, {
      targetCharacters: this.configService.get(
        'CV_AUDIT_COVERAGE_TARGET_CHARACTERS',
        { infer: true },
      ),
      maxLines: this.configService.get('CV_AUDIT_COVERAGE_MAX_LINES', {
        infer: true,
      }),
    });
  }

  private getAuditConcurrency() {
    return this.configService.get('CV_AUDIT_CONCURRENCY', { infer: true });
  }

  private getLineContext(
    candidateHighlights: CandidateHighlight[],
    batch: CandidateHighlight[],
  ) {
    const batchIds = new Set(batch.map((line) => line.id));
    const batchIndexes = candidateHighlights
      .map((line, index) => (batchIds.has(line.id) ? index : -1))
      .filter((index) => index >= 0);

    if (batchIndexes.length === 0) {
      return batch;
    }

    const start = Math.max(
      0,
      Math.min(...batchIndexes) - LINE_AUDIT_CONTEXT_OVERLAP,
    );
    const end = Math.min(
      candidateHighlights.length,
      Math.max(...batchIndexes) + LINE_AUDIT_CONTEXT_OVERLAP + 1,
    );

    return candidateHighlights.slice(start, end);
  }

  private dedupeLineFeedbacks(
    feedbacks: ReturnType<
      typeof lineCvAuditResultSchema.parse
    >['detailed_feedbacks'],
  ) {
    const seen = new Set<string>();

    return feedbacks.filter((feedback) => {
      const key = [
        feedback.source_line_id,
        this.compactTextForAnchor(feedback.original_text),
        feedback.issue.trim().toLowerCase(),
      ].join('|');

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  private async requestLineAudit(
    client: OpenAI,
    input: AnalyzeCvInput,
    batch: CandidateHighlight[],
    contextLines: CandidateHighlight[],
    batchNumber: number,
    totalBatches: number,
  ) {
    const event = {
      batchIndex: batchNumber - 1,
      totalBatches,
      batch,
    };
    let content = '';
    let lastError: unknown = null;

    try {
      await input.onLineBatchStart?.(event);
      content = await this.requestAuditJson(
        client,
        this.createLineAuditRequest(
          input,
          batch,
          contextLines,
          batchNumber,
          totalBatches,
        ),
      );

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const result = lineCvAuditResultSchema.parse(
            this.parseJsonContent(content),
          );
          this.validateReviewedLineIds(result, batch);
          this.validateFeedbackEvidence(result, batch, contextLines);
          this.validateFeedbackAnchors(result, batch);
          return result;
        } catch (error) {
          lastError = error;

          if (attempt === 2) {
            break;
          }

          content = await this.requestAuditJson(
            client,
            this.createLineRepairRequest(
              input,
              batch,
              content,
              error,
              attempt + 1,
            ),
          );
        }
      }

      throw new BadGatewayException({
        message:
          'Phản hồi DeepSeek không khớp schema audit CV từng dòng sau khi sửa.',
        cause: this.formatValidationError(lastError),
      });
    } catch (error) {
      await input.onLineBatchFailed?.({ ...event, error });
      throw error;
    }
  }

  private async requestCoverageAudit(
    client: OpenAI,
    input: AnalyzeCvInput,
    batch: CandidateHighlight[],
    contextLines: CandidateHighlight[],
    existingFeedbacks: ReturnType<
      typeof lineCvAuditResultSchema.parse
    >['detailed_feedbacks'],
  ) {
    let content = await this.requestAuditJson(
      client,
      this.createCoverageAuditRequest(
        input,
        batch,
        contextLines,
        existingFeedbacks,
      ),
    );
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const result = lineCvAuditResultSchema.parse(
          this.parseJsonContent(content),
        );
        this.validateReviewedLineIds(result, batch);
        this.validateFeedbackEvidence(result, batch, contextLines);
        this.validateFeedbackAnchors(result, batch);
        return result;
      } catch (error) {
        lastError = error;

        if (attempt === 2) {
          break;
        }

        content = await this.requestAuditJson(
          client,
          this.createLineRepairRequest(
            input,
            batch,
            content,
            error,
            attempt + 1,
          ),
        );
      }
    }

    throw new BadGatewayException({
      message:
        'Phản hồi DeepSeek không khớp schema audit CV phủ sóng sau khi sửa.',
      cause: this.formatValidationError(lastError),
    });
  }

  private getClient() {
    if (this.client) {
      return this.client;
    }

    const apiKey = this.configService.get('DEEPSEEK_API_KEY', { infer: true });

    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Thiếu DEEPSEEK_API_KEY trong server/.env',
      );
    }

    this.client = new OpenAI({
      baseURL: this.configService.get('DEEPSEEK_BASE_URL', { infer: true }),
      apiKey,
    });

    return this.client;
  }

  private createFinalAuditRequest(
    input: AnalyzeCvInput,
    detailedFeedbacks: ReturnType<
      typeof lineCvAuditResultSchema.parse
    >['detailed_feedbacks'],
  ): ChatCompletionCreateParamsNonStreaming {
    const model = this.configService.get('DEEPSEEK_MODEL', { infer: true });
    const targetRole = input.target.targetRole?.trim() || 'not specified';
    const targetCategory = input.target.jobCategoryName || 'not specified';
    const targetSeniority = input.target.seniorityLevelName || 'not specified';
    const seniorityDescription =
      input.target.seniorityDescription || 'No seniority description provided.';
    const jobDescription =
      input.target.jobDescription?.trim() ||
      'No employer job description provided.';

    return {
      model,
      stream: false,
      reasoning_effort: 'high',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a senior technical recruiter and CV auditor. Return only valid JSON. Do not use markdown.',
        },
        {
          role: 'user',
          content: [
            'Create the final CV audit report after line-level review has already completed.',
            `Selected job category/domain: ${targetCategory}`,
            `Selected seniority/position level: ${targetSeniority}`,
            `Resolved target: ${targetRole}`,
            `Seniority expectation: ${seniorityDescription}`,
            `Employer JD, if provided: ${jobDescription.slice(0, 5000)}`,
            '',
            'Evaluation rubric, based on common career-center resume guidance:',
            '- Judge fit for the selected job category/domain and selected seniority/position level. The selected target is authoritative.',
            '- For intern/fresher/junior candidates, prioritize fundamentals, relevant projects, learning trajectory, clarity, truthful scope, and role alignment. Do not require senior production ownership.',
            '- Only penalize missing cloud, CI/CD, testing, monitoring, system design, or DevOps if the target role/JD explicitly requires it or the CV claims a level where those are expected.',
            '- For manager/lead/director levels, evaluate leadership scope, people/process ownership, stakeholder work, metrics, and strategic impact instead of only hands-on tools.',
            '- Strong feedback should follow: Action verb + context/technology + purpose/result/impact. Encourage quantification when realistic.',
            '- Tailor ATS keywords to the target role, but avoid keyword stuffing.',
            '- If target role conflicts with CV positioning, flag the mismatch and suggest a truthful repositioning, not fake experience.',
            '- Never invent years of experience, seniority, tools, certifications, employers, metrics, leadership scope, or testing work that is not supported by the CV. Recommendations may say what evidence to add if true, but must not present it as already true.',
            '',
            'Rules:',
            '- Score the CV from 0 to 100.',
            '- This is the final synthesis pass. Do not return detailed_feedbacks here.',
            '- Base the final score on the full CV, selected target, selected seniority, and the validated line-level findings provided below.',
            '- The score must be consistent with the severity and quantity of line-level findings. Severe target/seniority mismatch should strongly reduce target alignment and seniority fit.',
            '- Return score_breakdown with dimensions that explain the score. Use general dimensions such as target alignment, seniority fit, evidence quality, ATS/keyword coverage, and clarity/readability. These are rubric dimensions, not assumed CV sections.',
            '- score_breakdown[].max_score values must sum to exactly 100.',
            '- overall_score must equal the sum of score_breakdown[].score values.',
            '- Use different max_score values only as rubric weights. Higher max_score means that dimension matters more for the selected target.',
            '- Infer section names dynamically from the CV content. Do not assume every CV has the same sections.',
            '- Suggest keywords, role names, and job titles that fit this CV.',
            '- Write every AI-authored display field in Vietnamese: summary, score dimension, rationale, general feedback topic/comment/recommendation, detailed issue/section/suggestion, and job reason. Technical terms, product names, and canonical job titles may remain in their standard form.',
            '- Do not criticize missing spaces, extra spaces, letter spacing, kerning, font rendering, or characters separated by spaces. PDF extraction may split or join stylized text; treat that as a parser/font artifact, not a CV issue. Never mention spacing as an issue unless the semantic content itself is invalid.',
            '- Treat isolated URL/link lines as valid evidence links unless the URL itself is broken or mislabeled. If the linked work belongs to another domain, discuss that as a high-level positioning issue instead of highlighting the URL line.',
            '- Prefer feedback about content quality, quantified impact, role alignment, project clarity, consistency, truthful title alignment, and ATS keywords.',
            '- Find all high-level gaps that cannot be tied to one exact CV line: missing evidence, missing section, weak overall positioning, seniority mismatch, career-track mismatch, keyword/ATS gap, and target-fit gap.',
            '- Return one general_feedback item for every distinct high-level gap. Do not collapse unrelated gaps into one generic feedback.',
            '- If the CV is written for a different career track than the selected job category/domain, suggestions must help the candidate reposition toward the selected domain or honestly tell them to apply to the original domain. Do not recommend job titles from the old CV domain as high-fit jobs for the selected target.',
            '- Do not treat phrases from the old CV direction as the selected target direction. If a phrase conflicts with the selected target, explain the mismatch and suggest a truthful target-aligned rewrite.',
            '- suggested_roles and suggested_jobs must prioritize the selected job category/domain and selected seniority. If fit is low, use match_level "stretch" and explain the gap in Vietnamese.',
            '',
            'Return this exact JSON shape:',
            JSON.stringify({
              overall_score: 75,
              summary: 'Tóm tắt ngắn gọn bằng tiếng Việt.',
              score_breakdown: [
                {
                  dimension: 'Mức độ phù hợp mục tiêu',
                  score: 20,
                  max_score: 35,
                  rationale:
                    'Giải thích bằng tiếng Việt dựa trên bằng chứng trong CV.',
                },
                {
                  dimension: 'Chất lượng bằng chứng',
                  score: 12,
                  max_score: 20,
                  rationale:
                    'Giải thích bằng tiếng Việt dựa trên dự án và kinh nghiệm.',
                },
                {
                  dimension: 'Độ phủ từ khóa ATS',
                  score: 8,
                  max_score: 15,
                  rationale:
                    'Giải thích bằng tiếng Việt về độ phủ từ khóa mục tiêu.',
                },
              ],
              general_feedbacks: [
                {
                  id: 'gf_01',
                  topic: 'Định vị tổng thể',
                  severity: 'warning',
                  comment: 'Nhận xét tổng quan bằng tiếng Việt.',
                  recommendation:
                    'Khuyến nghị bằng tiếng Việt cho định hướng CV.',
                },
              ],
              suggested_keywords: [
                'Target Skill A',
                'Target Skill B',
                'Target Tool',
              ],
              suggested_roles: ['Target Role A'],
              suggested_jobs: [
                {
                  title: 'Target Job A',
                  reason:
                    'Giải thích bằng tiếng Việt vì sao công việc phù hợp.',
                  match_level: 'high',
                },
                {
                  title: 'Target Job B',
                  reason:
                    'Giải thích bằng tiếng Việt vì sao công việc phù hợp.',
                  match_level: 'medium',
                },
                {
                  title: 'Adjacent Target Job',
                  reason:
                    'Giải thích bằng tiếng Việt vì sao đây là lựa chọn thử sức.',
                  match_level: 'stretch',
                },
              ],
            }),
            '',
            'Validated line-level findings:',
            this.formatLineFindings(detailedFeedbacks),
            '',
            'Full extracted CV text:',
            input.resumeText,
          ].join('\n'),
        },
      ],
      // DeepSeek-specific request extension. OpenAI SDK forwards unknown body
      // fields, while TypeScript only models the OpenAI-compatible subset.
      thinking: { type: 'enabled' },
    } as ChatCompletionCreateParamsNonStreaming;
  }

  private createFinalRepairRequest(
    input: AnalyzeCvInput,
    detailedFeedbacks: ReturnType<
      typeof lineCvAuditResultSchema.parse
    >['detailed_feedbacks'],
    invalidContent: string,
    error: unknown,
    attempt: number,
  ): ChatCompletionCreateParamsNonStreaming {
    const model = this.configService.get('DEEPSEEK_MODEL', { infer: true });
    const targetRole = input.target.targetRole?.trim() || 'not specified';

    return {
      model,
      stream: false,
      reasoning_effort: 'high',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You repair invalid CV audit JSON. Return only valid JSON. Do not add markdown.',
        },
        {
          role: 'user',
          content: [
            `Target role: ${targetRole}`,
            `Repair attempt: ${attempt}`,
            '',
            'The previous final audit JSON failed validation. Fix the JSON without inventing facts.',
            'Return only: overall_score, summary, score_breakdown, general_feedbacks, suggested_keywords, suggested_roles, suggested_jobs.',
            'Do not return detailed_feedbacks in this final synthesis pass.',
            'Base score and score_breakdown on the validated line-level findings.',
            'score_breakdown max_score values must sum to exactly 100, and overall_score must equal the sum of score_breakdown score values.',
            'Never repair by complaining about missing spaces, extra spaces, letter spacing, or PDF extraction artifacts.',
            'Do not change the business judgment unless needed to obey the selected target role.',
            'Keep every AI-authored display field in Vietnamese: summary, score dimension/rationale, general feedback topic/comment/recommendation, and suggested job reason. Preserve standard technical terms and job titles where appropriate.',
            '',
            'Validation error:',
            this.formatValidationError(error),
            '',
            'Validated line-level findings:',
            this.formatLineFindings(detailedFeedbacks),
            '',
            'Invalid JSON:',
            invalidContent,
          ].join('\n'),
        },
      ],
      thinking: { type: 'enabled' },
    } as ChatCompletionCreateParamsNonStreaming;
  }

  private createLineAuditRequest(
    input: AnalyzeCvInput,
    batch: CandidateHighlight[],
    contextLines: CandidateHighlight[],
    batchNumber: number,
    totalBatches: number,
  ): ChatCompletionCreateParamsNonStreaming {
    const model = this.configService.get('DEEPSEEK_MODEL', { infer: true });
    const targetRole = input.target.targetRole?.trim() || 'not specified';
    const targetCategory = input.target.jobCategoryName || 'not specified';
    const targetSeniority = input.target.seniorityLevelName || 'not specified';
    const seniorityDescription =
      input.target.seniorityDescription || 'No seniority description provided.';
    const jobDescription =
      input.target.jobDescription?.trim() ||
      'No employer job description provided.';

    return {
      model,
      stream: false,
      reasoning_effort: 'high',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a meticulous CV line auditor. Return only valid JSON. Do not use markdown.',
        },
        {
          role: 'user',
          content: [
            'Audit this batch of CV lines for the selected target.',
            `Selected job category/domain: ${targetCategory}`,
            `Selected seniority/position level: ${targetSeniority}`,
            `Resolved target: ${targetRole}`,
            `Seniority expectation: ${seniorityDescription}`,
            `Employer JD, if provided: ${jobDescription.slice(0, 5000)}`,
            `Batch: ${batchNumber}/${totalBatches}`,
            '',
            'Line-level rules:',
            '- Only evaluate the candidate highlight lines in this batch.',
            '- Use surrounding context lines only to understand meaning and section flow. Do not return feedback for context-only lines unless their id is also in the current batch.',
            '- Scan every line in this batch. Do not sample. Do not stop after a few findings.',
            '- Infer what each line represents from the line itself and the surrounding lines in this ordered batch. Do not assume fixed CV sections.',
            '- PDF text extraction may show uppercase words as separated letters. Read those as normal words/phrases when evaluating meaning.',
            '- Return a detailed_feedback item only for a line that contains exact wording the candidate should directly rewrite, remove, or replace.',
            '- Compare each line against the selected job category/domain and seniority. Flag weak evidence, irrelevant evidence, misleading positioning, seniority mismatch, unclear impact, generic claims, and missing target-specific context when the line itself shows that problem.',
            '- Any line that explicitly states a desired role, candidate positioning, professional identity, or career objective is high priority. If it conflicts with the selected target category/domain or seniority, return a detailed_feedback item for that line.',
            '- If a line contains multiple comma-separated skills, tools, or responsibilities, evaluate the whole line as one evidence unit and explain the target-fit problem for that unit. Do not highlight only one label or one token from that line.',
            '- Keep coverage consistent across repeated CV items. If two lines have the same structural role in different repeated items and the same target-fit problem applies, return feedback for both lines instead of only the first one.',
            '- When a repeated item heading/title names a project or work item, evaluate whether that title communicates target relevance in context. If it carries the same target mismatch as a similar item title, flag it too.',
            '- If a line is fine, omit it. If a problem is global, missing, inferred only from absence, or not solved by rewriting this exact line, omit it here; the final synthesis pass handles it.',
            '- Do not use line-level feedback to merely point at evidence that caused a score. If the line is only background evidence for a broader conclusion, omit it here.',
            '- Treat structural/navigation/factual metadata text as context, not target evidence. Do not create detailed_feedback for such text unless the wording itself is the exact text that should be changed.',
            '- source_line_id must be one id from this batch.',
            '- original_text must be copied from the same source line. Use the full reviewable span. If the line has a label plus content after ":" or "-", include the content, not only the label; usually use the whole line.',
            '- highlight_text is optional. If provided, it must be the smallest exact text span inside original_text that should be visually marked. Use the whole original_text only when the whole span needs review.',
            '- Do not use structural/navigation/factual metadata text as original_text unless that wording itself is the exact problem.',
            '- Every detailed_feedback item must include a non-empty suggestion written in Vietnamese, even when original_text is English. Preserve technical terms and proper nouns where appropriate.',
            '- Write section, issue, and suggestion in natural Vietnamese. Do not return English commentary.',
            '- Suggestions must be truth-preserving. Do not invent years of experience, seniority, tools, certifications, metrics, leadership scope, or testing activities that are not supported by original_text or nearby context.',
            '- If the selected target requires evidence missing from the line, suggest a truthful rewrite using transferable evidence, or explicitly mark target-specific evidence as something to add only if true.',
            '- Set suggestion_mode to direct_rewrite only when every factual claim in suggestion is supported by the cited CV lines. Otherwise use conditional_recommendation and phrase the suggestion conditionally, never as an achievement the candidate already completed.',
            '- evidence_source_line_ids must include source_line_id plus every batch or surrounding-context line used to support factual claims in suggestion. Do not cite a line that does not contain the claimed evidence.',
            '- Never complain about missing spaces, extra spaces, letter spacing, joined words, kerning, or PDF extraction artifacts.',
            '- Treat isolated URL/link lines as valid evidence links unless the URL itself is semantically wrong or mislabeled.',
            '- Use red for critical target mismatch or misleading claims. Use yellow for improvements.',
            '- Avoid duplicate feedback for the same source_line_id unless there are truly separate issues.',
            '- reviewed_source_line_ids must list every source_line_id in this batch exactly once, including lines that need no feedback. This is the audit coverage receipt.',
            '',
            'Return this exact JSON shape:',
            JSON.stringify({
              reviewed_source_line_ids: batch.map((line) => line.id),
              detailed_feedbacks: [
                {
                  id: 'fb_01',
                  source_line_id: batch[0]?.id || 'hl_001',
                  section: 'Tên mục được suy luận bằng tiếng Việt',
                  original_text: batch[0]?.text || 'Exact CV text span',
                  severity: 'warning',
                  issue: 'Giải thích vấn đề bằng tiếng Việt.',
                  suggestion: 'Gợi ý chỉnh sửa rõ ràng bằng tiếng Việt.',
                  suggestion_mode: 'direct_rewrite',
                  evidence_source_line_ids: [batch[0]?.id || 'hl_001'],
                  highlight_color: 'yellow',
                },
              ],
            }),
            '',
            'Candidate highlight lines in this batch:',
            this.formatCandidateHighlights(batch),
            '',
            'Surrounding context lines:',
            this.formatCandidateHighlights(contextLines),
          ].join('\n'),
        },
      ],
      thinking: { type: 'enabled' },
    } as ChatCompletionCreateParamsNonStreaming;
  }

  private createCoverageAuditRequest(
    input: AnalyzeCvInput,
    batch: CandidateHighlight[],
    contextLines: CandidateHighlight[],
    existingFeedbacks: ReturnType<
      typeof lineCvAuditResultSchema.parse
    >['detailed_feedbacks'],
  ): ChatCompletionCreateParamsNonStreaming {
    const model = this.configService.get('DEEPSEEK_MODEL', { infer: true });
    const targetRole = input.target.targetRole?.trim() || 'not specified';
    const targetCategory = input.target.jobCategoryName || 'not specified';
    const targetSeniority = input.target.seniorityLevelName || 'not specified';
    const seniorityDescription =
      input.target.seniorityDescription || 'No seniority description provided.';
    const jobDescription =
      input.target.jobDescription?.trim() ||
      'No employer job description provided.';

    return {
      model,
      stream: false,
      reasoning_effort: 'high',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a CV audit quality-control reviewer. Return only valid JSON. Do not use markdown.',
        },
        {
          role: 'user',
          content: [
            'Run a coverage check for CV lines that were not flagged in the first pass.',
            `Selected job category/domain: ${targetCategory}`,
            `Selected seniority/position level: ${targetSeniority}`,
            `Resolved target: ${targetRole}`,
            `Seniority expectation: ${seniorityDescription}`,
            `Employer JD, if provided: ${jobDescription.slice(0, 5000)}`,
            '',
            'Coverage rules:',
            '- Only evaluate the candidate highlight lines in this coverage batch.',
            '- Use surrounding context lines only to understand meaning and continuity. Do not return feedback for context-only lines unless their id is also in this coverage batch.',
            '- The first pass findings are listed below. Do not duplicate them.',
            '- Review every unflagged line as a standalone evidence unit and as part of nearby context.',
            '- If the line makes a claim, lists tools/skills, describes work, states positioning, shows seniority, or provides evidence that conflicts with the selected target, return a detailed_feedback item.',
            '- Apply consistency across repeated CV items. Compare unflagged lines with the first pass findings: if an unflagged line has the same structural role and the same target-fit problem as an already flagged line from another repeated item, return feedback for it.',
            '- When an unflagged repeated item heading/title names a project or work item, evaluate whether that title communicates target relevance in context. Do not skip it solely because it is a heading/title.',
            '- If the line is merely a neutral separator, label, or metadata and does not need direct rewriting, omit it.',
            '- If a label and content appear in the same line, original_text must include both label and content. If the label appears alone, do not return feedback for that label-only line.',
            '- If the line contains multiple comma-separated skills, tools, or responsibilities, evaluate the whole line as one evidence unit.',
            '- Every detailed_feedback item must include a non-empty suggestion written in Vietnamese, even when original_text is English. Preserve technical terms and proper nouns where appropriate.',
            '- Write section, issue, and suggestion in natural Vietnamese. Do not return English commentary.',
            '- Suggestions must be truth-preserving and must not invent experience, tools, metrics, seniority, or testing work.',
            '- Set suggestion_mode to direct_rewrite only when every factual claim in suggestion is supported by the cited CV lines. Otherwise use conditional_recommendation and make the suggestion explicitly conditional.',
            '- evidence_source_line_ids must include source_line_id plus every coverage-batch or surrounding-context line used as factual support. Cite only lines that actually contain that evidence.',
            '- Do not complain about missing spaces, extra spaces, joined words, letter spacing, kerning, or PDF extraction artifacts.',
            '- Treat isolated URL/link lines as valid evidence links unless the URL itself is semantically wrong or mislabeled.',
            '- Use red for critical target mismatch or misleading claims. Use yellow for improvements.',
            '- reviewed_source_line_ids must list every source_line_id in this coverage batch exactly once, including lines that need no feedback.',
            '',
            'Return this exact JSON shape:',
            JSON.stringify({
              reviewed_source_line_ids: batch.map((line) => line.id),
              detailed_feedbacks: [
                {
                  id: 'fb_coverage_01',
                  source_line_id: batch[0]?.id || 'hl_001',
                  section: 'Tên mục được suy luận bằng tiếng Việt',
                  original_text: batch[0]?.text || 'Exact CV text span',
                  severity: 'warning',
                  issue: 'Giải thích vấn đề bị bỏ sót bằng tiếng Việt.',
                  suggestion: 'Gợi ý chỉnh sửa rõ ràng bằng tiếng Việt.',
                  suggestion_mode: 'direct_rewrite',
                  evidence_source_line_ids: [batch[0]?.id || 'hl_001'],
                  highlight_color: 'yellow',
                },
              ],
            }),
            '',
            'First pass findings already accepted:',
            this.formatLineFindings(existingFeedbacks),
            '',
            'Unflagged candidate highlight lines to coverage-check:',
            this.formatCandidateHighlights(batch),
            '',
            'Surrounding context lines:',
            this.formatCandidateHighlights(contextLines),
          ].join('\n'),
        },
      ],
      thinking: { type: 'enabled' },
    } as ChatCompletionCreateParamsNonStreaming;
  }

  private createLineRepairRequest(
    input: AnalyzeCvInput,
    batch: CandidateHighlight[],
    invalidContent: string,
    error: unknown,
    attempt: number,
  ): ChatCompletionCreateParamsNonStreaming {
    const model = this.configService.get('DEEPSEEK_MODEL', { infer: true });
    const targetRole = input.target.targetRole?.trim() || 'not specified';

    return {
      model,
      stream: false,
      reasoning_effort: 'high',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You repair invalid line-level CV audit JSON. Return only valid JSON. Do not add markdown.',
        },
        {
          role: 'user',
          content: [
            `Target role: ${targetRole}`,
            `Repair attempt: ${attempt}`,
            '',
            'The previous line-level JSON failed validation. Fix the JSON without inventing facts.',
            'Return only { "reviewed_source_line_ids": [...], "detailed_feedbacks": [...] }.',
            'reviewed_source_line_ids must contain every source_line_id from this batch exactly once, including lines with no issue.',
            'Each detailed_feedback item must have source_line_id from this batch, original_text copied from that same line, and non-empty suggestion.',
            'Each detailed_feedback item must have suggestion_mode as direct_rewrite or conditional_recommendation and a non-empty evidence_source_line_ids array that includes source_line_id.',
            'Only use direct_rewrite when every factual claim in suggestion is supported by the cited batch lines. Otherwise use conditional_recommendation and phrase it conditionally rather than inventing experience.',
            'If a source line has label plus content, original_text must include the content, not only the label.',
            'Write section, issue, and suggestion in natural Vietnamese, even when original_text is English. Preserve technical terms and proper nouns where appropriate.',
            'If a source line explicitly states role, positioning, professional identity, or career objective and conflicts with the target, keep a detailed_feedback item for that line.',
            'Remove feedback anchored only to structural/navigation text unless that exact wording is the text that should be changed.',
            'If highlight_text is present, it must be an exact span inside original_text. Prefer the smallest useful span, not unrelated surrounding text.',
            'Never repair by complaining about missing spaces, extra spaces, letter spacing, or PDF extraction artifacts.',
            'If a feedback item cannot be anchored to one exact batch line, remove it from detailed_feedbacks.',
            '',
            'Validation error:',
            this.formatValidationError(error),
            '',
            'Candidate highlight lines in this batch:',
            this.formatCandidateHighlights(batch),
            '',
            'Invalid JSON:',
            invalidContent,
          ].join('\n'),
        },
      ],
      thinking: { type: 'enabled' },
    } as ChatCompletionCreateParamsNonStreaming;
  }

  private async requestAuditJson(
    client: OpenAI,
    request: ChatCompletionCreateParamsNonStreaming,
  ) {
    const completion = await client.chat.completions.create(request);
    const content = completion.choices[0]?.message.content;

    if (!content) {
      throw new BadGatewayException('DeepSeek trả về phản hồi trống.');
    }

    return content;
  }

  private parseAuditContent(content: string, input: AnalyzeCvInput) {
    const normalized = content
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '');

    const rawResult = rawCvAuditResultSchema.parse(JSON.parse(normalized));
    this.validateFeedbackAnchors(rawResult, input.candidateHighlights);
    return cvAuditResultSchema.parse(this.normalizeAuditResult(rawResult));
  }

  private validateFeedbackAnchors(
    result: {
      detailed_feedbacks: ReturnType<
        typeof rawCvAuditResultSchema.parse
      >['detailed_feedbacks'];
    },
    candidateHighlights: CandidateHighlight[],
  ) {
    const highlightMap = new Map(
      candidateHighlights.map((highlight) => [highlight.id, highlight]),
    );
    const invalidFeedbacks: string[] = [];

    for (const feedback of result.detailed_feedbacks) {
      const sourceLine = highlightMap.get(feedback.source_line_id);

      if (!sourceLine) {
        invalidFeedbacks.push(
          `${feedback.id || '(missing id)'} references unknown source_line_id "${feedback.source_line_id}".`,
        );
        continue;
      }

      if (
        !this.isTextAnchoredToSourceLine(
          feedback.original_text,
          sourceLine.text,
        )
      ) {
        invalidFeedbacks.push(
          `${feedback.id || feedback.source_line_id} original_text is not copied from ${feedback.source_line_id}.`,
        );
        continue;
      }

      if (this.isLabelOnlyAnchor(feedback.original_text, sourceLine.text)) {
        invalidFeedbacks.push(
          `${feedback.id || feedback.source_line_id} original_text only highlights a label while ${feedback.source_line_id} contains reviewable content.`,
        );
      }

      const languageError = this.getSuggestionLanguageError(feedback);

      if (languageError) {
        invalidFeedbacks.push(
          `${feedback.id || feedback.source_line_id} ${languageError}`,
        );
      }
    }

    if (invalidFeedbacks.length > 0) {
      throw new Error(
        [
          'Anchor phản hồi của DeepSeek không hợp lệ.',
          ...invalidFeedbacks.slice(0, 20),
        ].join('\n'),
      );
    }
  }

  private validateReviewedLineIds(
    result: ReturnType<typeof lineCvAuditResultSchema.parse>,
    batch: CandidateHighlight[],
  ) {
    const expectedIds = new Set(batch.map((line) => line.id));
    const reviewedIds = result.reviewed_source_line_ids;
    const reviewedSet = new Set(reviewedIds);
    const missingIds = [...expectedIds].filter((id) => !reviewedSet.has(id));
    const unknownIds = [...reviewedSet].filter((id) => !expectedIds.has(id));

    if (
      missingIds.length > 0 ||
      unknownIds.length > 0 ||
      reviewedIds.length !== reviewedSet.size
    ) {
      throw new Error(
        [
          'Biên nhận phủ sóng reviewed_source_line_ids không hợp lệ.',
          `missing=${missingIds.join(',') || 'none'}`,
          `unknown=${unknownIds.join(',') || 'none'}`,
          `duplicates=${reviewedIds.length !== reviewedSet.size}`,
        ].join(' '),
      );
    }
  }

  private validateFeedbackEvidence(
    result: ReturnType<typeof lineCvAuditResultSchema.parse>,
    batch: CandidateHighlight[],
    contextLines: CandidateHighlight[],
  ) {
    const allowedIds = new Set(
      [...batch, ...contextLines].map((line) => line.id),
    );
    const invalidFeedbacks: string[] = [];

    for (const feedback of result.detailed_feedbacks) {
      const evidenceIds = new Set(feedback.evidence_source_line_ids);
      const unknownIds = [...evidenceIds].filter((id) => !allowedIds.has(id));

      if (!evidenceIds.has(feedback.source_line_id)) {
        invalidFeedbacks.push(
          `${feedback.id || feedback.source_line_id} không trích dẫn source_line_id của nó làm bằng chứng.`,
        );
      }

      if (unknownIds.length > 0) {
        invalidFeedbacks.push(
          `${feedback.id || feedback.source_line_id} trích dẫn bằng chứng không có sẵn: ${unknownIds.join(',')}.`,
        );
      }
    }

    if (invalidFeedbacks.length > 0) {
      throw new Error(
        [
          'Bằng chứng phản hồi của DeepSeek không hợp lệ.',
          ...invalidFeedbacks,
        ].join('\n'),
      );
    }
  }

  private validateScoreBreakdown(
    result: ReturnType<typeof generalCvAuditResultSchema.parse>,
  ) {
    const maxScore = result.score_breakdown.reduce(
      (total, item) => total + item.max_score,
      0,
    );
    const score = result.score_breakdown.reduce(
      (total, item) => total + item.score,
      0,
    );

    if (maxScore !== 100 || score !== result.overall_score) {
      throw new Error(
        `Tổng score_breakdown không hợp lệ. max_score sum=${maxScore}, score sum=${score}, overall_score=${result.overall_score}.`,
      );
    }
  }

  private attachHighlightText<
    TResult extends {
      detailed_feedbacks: ReturnType<
        typeof rawCvAuditResultSchema.parse
      >['detailed_feedbacks'];
    },
  >(result: TResult, candidateHighlights: CandidateHighlight[]): TResult {
    const highlightMap = new Map(
      candidateHighlights.map((highlight) => [highlight.id, highlight]),
    );

    return {
      ...result,
      detailed_feedbacks: result.detailed_feedbacks.map((feedback) => ({
        ...feedback,
        highlight_text: this.resolveFeedbackHighlightText(
          feedback,
          highlightMap.get(feedback.source_line_id)?.text,
        ),
      })),
    };
  }

  private resolveFeedbackHighlightText(
    feedback: ReturnType<
      typeof rawCvAuditResultSchema.parse
    >['detailed_feedbacks'][number],
    sourceLine?: string,
  ) {
    const requestedHighlight = feedback.highlight_text.trim();

    if (
      requestedHighlight &&
      sourceLine &&
      this.isTextAnchoredToSourceLine(requestedHighlight, sourceLine)
    ) {
      return requestedHighlight;
    }

    return feedback.original_text;
  }

  private isTextAnchoredToSourceLine(originalText: string, sourceLine: string) {
    const original = this.compactTextForAnchor(originalText);
    const source = this.compactTextForAnchor(sourceLine);

    return original.length >= 8 && source.includes(original);
  }

  private compactTextForAnchor(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9+#./@-]/gi, '')
      .toLowerCase();
  }

  private isLabelOnlyAnchor(originalText: string, sourceLine: string) {
    const separatorMatch = sourceLine.match(/^(.{1,36}?)([:\-–—])\s*(.+)$/);

    if (!separatorMatch) {
      return false;
    }

    const [, label, , content] = separatorMatch;
    const labelCompact = this.compactTextForAnchor(label);
    const contentCompact = this.compactTextForAnchor(content);
    const originalCompact = this.compactTextForAnchor(originalText);

    if (labelCompact.length < 2 || contentCompact.length < 8) {
      return false;
    }

    return originalCompact === labelCompact;
  }

  private getSuggestionLanguageError(
    feedback: ReturnType<
      typeof rawCvAuditResultSchema.parse
    >['detailed_feedbacks'][number],
  ) {
    if (!this.containsVietnameseText(feedback.section)) {
      return 'section phải được viết bằng tiếng Việt.';
    }
    if (!this.containsVietnameseText(feedback.issue)) {
      return 'issue phải được viết bằng tiếng Việt.';
    }
    if (!this.containsVietnameseText(feedback.suggestion)) {
      return 'suggestion phải được viết bằng tiếng Việt.';
    }

    return null;
  }

  private validateFinalAuditLanguage(
    result: ReturnType<typeof generalCvAuditResultSchema.parse>,
  ) {
    const fields = [
      ['summary', result.summary],
      ...result.score_breakdown.flatMap((item, index) => [
        [`score_breakdown[${index}].dimension`, item.dimension],
        [`score_breakdown[${index}].rationale`, item.rationale],
      ]),
      ...result.general_feedbacks.flatMap((item, index) => [
        [`general_feedbacks[${index}].topic`, item.topic],
        [`general_feedbacks[${index}].comment`, item.comment],
        [`general_feedbacks[${index}].recommendation`, item.recommendation],
      ]),
      ...result.suggested_jobs.map((item, index) => [
        `suggested_jobs[${index}].reason`,
        item.reason,
      ]),
    ] as Array<[string, string]>;

    const invalid = fields
      .filter(
        ([, value]) => value.trim() && !this.containsVietnameseText(value),
      )
      .map(([name]) => name);
    if (invalid.length > 0) {
      throw new Error(
        `Các trường nhận xét phải dùng tiếng Việt: ${invalid.join(', ')}`,
      );
    }
  }

  private detectDominantLanguage(value: string) {
    if (this.containsVietnameseText(value)) {
      return 'vietnamese';
    }

    const latinWords = value.match(/[A-Za-z]{2,}/g) ?? [];

    if (latinWords.length >= 2) {
      return 'english';
    }

    const latinLetters = value.replace(/[^A-Za-z]/g, '');

    return latinLetters.length >= 4 ? 'english' : 'unknown';
  }

  private containsVietnameseText(value: string) {
    return /[ăâđêôơưáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(
      value,
    );
  }

  private formatCandidateHighlights(candidateHighlights: CandidateHighlight[]) {
    return candidateHighlights
      .map(
        (line) =>
          `- ${line.id} | page ${line.pageNumber} | language ${this.detectDominantLanguage(line.text)} | ${line.text}`,
      )
      .join('\n');
  }

  private formatLineFindings(
    feedbacks: ReturnType<
      typeof lineCvAuditResultSchema.parse
    >['detailed_feedbacks'],
  ) {
    if (feedbacks.length === 0) {
      return '- No line-level findings were returned.';
    }

    return feedbacks
      .slice(0, 80)
      .map((feedback, index) =>
        [
          `${index + 1}. ${feedback.severity.toUpperCase()}`,
          `source=${feedback.source_line_id}`,
          `section=${feedback.section}`,
          `text=${feedback.original_text}`,
          `issue=${feedback.issue}`,
          `suggestion=${feedback.suggestion}`,
        ].join(' | '),
      )
      .join('\n');
  }

  private formatValidationError(error: unknown) {
    if (error instanceof ZodError) {
      return JSON.stringify(error.issues, null, 2);
    }

    if (error instanceof SyntaxError) {
      return error.message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  private normalizeAuditResult(
    result: ReturnType<typeof rawCvAuditResultSchema.parse>,
  ): CvAuditResult {
    return {
      ...result,
      general_feedbacks: this.normalizeGeneralFeedbacks(
        result.general_feedbacks,
      ),
      detailed_feedbacks: this.normalizeFeedbacks(result.detailed_feedbacks),
      suggested_keywords: this.unique(result.suggested_keywords).slice(0, 20),
      suggested_roles: this.unique(result.suggested_roles).slice(0, 10),
      suggested_jobs: this.uniqueJobs(result.suggested_jobs).slice(0, 10),
    };
  }

  private normalizeFeedbacks(
    feedbacks: ReturnType<
      typeof rawCvAuditResultSchema.parse
    >['detailed_feedbacks'],
  ) {
    return feedbacks.map((feedback, index) => {
      return {
        ...feedback,
        id: `fb_${String(index + 1).padStart(3, '0')}_${feedback.source_line_id}`,
        section: feedback.section.trim(),
        original_text: feedback.original_text.trim(),
        highlight_text: feedback.highlight_text.trim(),
        issue: feedback.issue.trim(),
        suggestion: feedback.suggestion.trim(),
      };
    });
  }

  private normalizeGeneralFeedbacks(
    feedbacks: ReturnType<
      typeof rawCvAuditResultSchema.parse
    >['general_feedbacks'],
  ) {
    return feedbacks.map((feedback, index) => ({
      ...feedback,
      id: feedback.id || `gf_${index + 1}`,
      topic: feedback.topic.trim(),
      comment: feedback.comment.trim(),
      recommendation: feedback.recommendation.trim(),
    }));
  }

  private unique(values: string[]) {
    const seen = new Set<string>();

    return values.filter((value) => {
      const normalized = value.trim().toLowerCase();

      if (!normalized || seen.has(normalized)) {
        return false;
      }

      seen.add(normalized);
      return true;
    });
  }

  private uniqueJobs(
    jobs: ReturnType<typeof rawCvAuditResultSchema.parse>['suggested_jobs'],
  ) {
    const seen = new Set<string>();

    return jobs
      .map((job) => ({
        ...job,
        title: job.title.trim(),
        reason: job.reason.trim(),
      }))
      .filter((job) => {
        const normalized = job.title.toLowerCase();

        if (!normalized || seen.has(normalized)) {
          return false;
        }

        seen.add(normalized);
        return true;
      });
  }

  private async requestJobMatchBatch(
    client: OpenAI,
    target: Parameters<AiEngineService['classifyJobMatches']>[0]['target'],
    batch: Parameters<AiEngineService['classifyJobMatches']>[0]['jobs'],
  ) {
    let content = await this.requestAuditJson(
      client,
      this.createJobMatchRequest(target, batch),
    );
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const result = jobMatchBatchSchema.parse(
          this.parseJsonContent(content),
        );
        this.validateJobMatchCoverage(result.matches, batch);
        if (
          result.matches.some(
            (match) => !this.containsVietnameseText(match.reason),
          )
        ) {
          throw new Error(
            'Mọi lý do khớp việc làm phải được viết bằng tiếng Việt.',
          );
        }
        return result.matches;
      } catch (error) {
        lastError = error;

        if (attempt === 2) {
          break;
        }

        content = await this.requestAuditJson(
          client,
          this.createJobMatchRepairRequest(target, batch, content, error),
        );
      }
    }

    throw new BadGatewayException({
      message: 'Phản hồi DeepSeek không khớp schema khớp việc làm sau khi sửa.',
      cause: this.formatValidationError(lastError),
    });
  }

  private createJobMatchRequest(
    target: Parameters<AiEngineService['classifyJobMatches']>[0]['target'],
    batch: Parameters<AiEngineService['classifyJobMatches']>[0]['jobs'],
  ): ChatCompletionCreateParamsNonStreaming {
    const model = this.configService.get('DEEPSEEK_MODEL', { infer: true });
    const targetRole = target.targetRole?.trim() || 'not specified';
    const targetSeniority =
      target.seniorityLevelName?.trim() || 'not specified';
    const keywords = target.keywords.slice(0, 30).join(', ') || 'none';

    return {
      model,
      stream: false,
      reasoning_effort: 'high',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a senior recruiter matching job postings to a candidate profile. Return only valid JSON. Do not use markdown.',
        },
        {
          role: 'user',
          content: [
            'Classify each job posting below against the candidate target.',
            `Candidate target role: ${targetRole}`,
            `Candidate seniority level: ${targetSeniority}`,
            `Candidate skill keywords: ${keywords}`,
            '',
            'Classification rules:',
            '- match: the job is the same occupation AND the seniority level in its title matches the candidate level EXACTLY (e.g. candidate targets Intern -> only titles with intern level evidence such as "Intern", "Internship", "Thực tập sinh"; candidate targets Senior -> titles with senior level evidence). A job at a higher or lower level than the candidate is never a match.',
            '- suggestion: the job is clearly the same or an adjacent occupation but the level differs from the candidate level (e.g. candidate targets Intern and the job is Fresher/Junior, or the title has no level evidence at all), or the level is too high (Middle/Senior) to reject outright but still related.',
            '- reject: the job is a different occupation, clearly irrelevant, OR the title shows a much higher level (Senior/Lead/Manager/Director) when the candidate targets Intern/Fresher — those must not appear as matches or suggestions.',
            '- Prefer the canonical category and seniority supplied for each job. Use the title only to verify that classification and reject obvious false positives.',
            '- Canonical IT seniority values are intern, fresher, junior, middle, senior, staff, principal, tech_lead, manager, and head_director.',
            '- score is 0-100: how well this job fits the candidate target overall. match must score >= 60; suggestion 30-59; reject < 30. For a candidate targeting Intern/Fresher, jobs whose titles show no level evidence are suggestions (typically 40-55) and must never be matches.',
            '- reason must be Vietnamese and explain the occupation fit and the level fit (or mismatch) in one or two sentences.',
            '- A Vietnamese title containing "Thực tập sinh" or "Intern" that is otherwise relevant to the target occupation is a match when the candidate targets Intern, even if the title does not repeat the exact occupation words.',
            '',
            'Return this exact JSON shape:',
            JSON.stringify({
              matches: [
                {
                  job_id: 'job id as provided',
                  level: 'inferred level or null',
                  match_kind: 'match | suggestion | reject',
                  score: 0,
                  reason: 'Giải thích mức độ phù hợp bằng tiếng Việt.',
                },
              ],
            }),
            '',
            'Job postings:',
            this.formatJobsForMatch(batch),
          ].join('\n'),
        },
      ],
      thinking: { type: 'enabled' },
    } as ChatCompletionCreateParamsNonStreaming;
  }

  private createJobMatchRepairRequest(
    target: Parameters<AiEngineService['classifyJobMatches']>[0]['target'],
    batch: Parameters<AiEngineService['classifyJobMatches']>[0]['jobs'],
    invalidContent: string,
    error: unknown,
  ): ChatCompletionCreateParamsNonStreaming {
    const model = this.configService.get('DEEPSEEK_MODEL', { infer: true });

    return {
      model,
      stream: false,
      reasoning_effort: 'high',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You repair invalid job match JSON. Return only valid JSON. Do not add markdown.',
        },
        {
          role: 'user',
          content: [
            'The previous job classification JSON failed validation. Fix the JSON without inventing facts.',
            'Return only: { "matches": [...] }.',
            'matches must contain exactly one item per job_id from the job list below, with no duplicates and no extra ids.',
            'Each match item must have job_id from the provided list, level as one of intern/fresher/junior/middle/senior/staff/principal/tech_lead/manager/head_director or null, match_kind as match/suggestion/reject, score as integer 0-100, and a non-empty Vietnamese reason.',
            '',
            'Validation error:',
            this.formatValidationError(error),
            '',
            'Job postings:',
            this.formatJobsForMatch(batch),
            '',
            'Invalid JSON:',
            invalidContent,
          ].join('\n'),
        },
      ],
      thinking: { type: 'enabled' },
    } as ChatCompletionCreateParamsNonStreaming;
  }

  private formatJobsForMatch(
    jobs: Parameters<AiEngineService['classifyJobMatches']>[0]['jobs'],
  ) {
    return jobs
      .map(
        (job, index) =>
          `${index + 1}. job_id=${job.jobId} | title=${job.title} | category=${job.categoryName ?? 'unknown'} | seniority=${job.seniorityCode ?? 'unknown'} | skills=${job.skills.slice(0, 15).join(', ') || 'none'}`,
      )
      .join('\n');
  }

  private validateJobMatchCoverage(
    matches: JobMatchResult[],
    batch: Parameters<AiEngineService['classifyJobMatches']>[0]['jobs'],
  ) {
    const expectedIds = new Set(batch.map((job) => job.jobId));
    const matchIds = matches.map((match) => match.job_id);
    const matchSet = new Set(matchIds);
    const missingIds = [...expectedIds].filter((id) => !matchSet.has(id));
    const unknownIds = [...matchSet].filter((id) => !expectedIds.has(id));

    if (
      missingIds.length > 0 ||
      unknownIds.length > 0 ||
      matchIds.length !== matchSet.size
    ) {
      throw new Error(
        [
          'Phủ sóng khớp việc làm không hợp lệ.',
          `missing=${missingIds.join(',') || 'none'}`,
          `unknown=${unknownIds.join(',') || 'none'}`,
          `duplicates=${matchIds.length !== matchSet.size}`,
        ].join(' '),
      );
    }
  }
}
