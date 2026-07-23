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

interface AnalyzeCvInput {
  target: {
    targetRole: string | null;
    jobCategoryId: number | null;
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
      result: ReturnType<typeof lineCvAuditResultSchema.parse>;
    },
  ) => Promise<void>;
  onLineBatchFailed?: (
    event: LineBatchEvent & { error: unknown },
  ) => Promise<void>;
}

interface LineBatchEvent {
  batchIndex: number;
  totalBatches: number;
  batch: CandidateHighlight[];
}

const LINE_AUDIT_BATCH_SIZE = 6;
const LINE_AUDIT_CONCURRENCY = 4;
const LINE_AUDIT_CONTEXT_OVERLAP = 3;

@Injectable()
export class AiEngineService {
  private client: OpenAI | null = null;

  constructor(private readonly configService: ConfigService<Env, true>) {}

  async inferCvTarget(input: {
    resumeText: string;
    headerLines: string[];
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
            '5. target_category_hint is only a broad category/domain hint; target_role must stay as the candidate-facing job title.',
            '6. The output language for role/category can follow the CV language.',
            '7. PDF extraction may letter-space header titles. If a top-line title is split into individual characters or unusual spacing, infer the normal phrase from that line instead of ignoring it.',
            '8. Preserve occupation wording from evidence. Do not transform a person/job title into a broader field noun unless the CV itself uses that broader wording.',
            '9. seniority_hint must be a concise level evidenced by the CV, such as Intern, Fresher, Junior, Middle, Senior, Lead, Manager, or empty only when the CV gives no evidence. If the header says Intern/Junior/etc., do not omit it.',
            '10. search_queries are for job-board crawling, not for display. They must be short, searchable phrases that maximize recall while staying close to the CV target. If a seniority level is evidenced, include level-aware queries first, then role-only variants. Prefer concise job titles and core specializations over long titles with parenthetical details.',
            '11. Do not rewrite a precise role into a different broad role. For example, a CV title like "Intern Frontend Developer" should remain a frontend developer target, not web development, software engineering, or a generic developer category.',
            '',
            'Return this exact JSON shape:',
            JSON.stringify({
              target_role: 'candidate-facing job title inferred from the CV',
              target_category_hint: 'broad domain/category inferred from the CV',
              seniority_hint: 'seniority or position level inferred from the CV',
              confidence: 0.8,
              reasoning:
                'Vietnamese explanation of how the target was inferred from the evidence.',
              keywords: ['relevant keyword 1', 'relevant keyword 2', 'relevant keyword 3'],
              search_queries: [
                'short searchable job title',
                'alternative concise job title',
                'core specialization keyword',
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

    return cvAuditResultSchema.parse(
      this.normalizeAuditResult(anchoredResult),
    );
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
        'DeepSeek response did not match the final CV audit schema after repair.',
      cause: this.formatValidationError(lastError),
    });
  }

  private async requestLineAudits(client: OpenAI, input: AnalyzeCvInput) {
    const batches = this.chunkCandidateHighlights(input.candidateHighlights);

    return this.runWithConcurrency(batches, LINE_AUDIT_CONCURRENCY, (batch, index) =>
      this.requestLineAudit(
        client,
        input,
        batch,
        this.getBatchContext(input.candidateHighlights, index),
        index + 1,
        batches.length,
      ),
    );
  }

  private async requestCoverageAudits(
    client: OpenAI,
    input: AnalyzeCvInput,
    existingFeedbacks: ReturnType<
      typeof lineCvAuditResultSchema.parse
    >['detailed_feedbacks'],
  ) {
    const reviewedLineIds = new Set(
      existingFeedbacks.map((feedback) => feedback.source_line_id),
    );
    const unreviewedHighlights = input.candidateHighlights.filter(
      (highlight) => !reviewedLineIds.has(highlight.id),
    );

    if (unreviewedHighlights.length === 0) {
      return [];
    }

    const batches = this.chunkCandidateHighlights(unreviewedHighlights);

    return this.runWithConcurrency(batches, LINE_AUDIT_CONCURRENCY, (batch) =>
      this.requestCoverageAudit(
        client,
        input,
        batch,
        this.getLineContext(input.candidateHighlights, batch),
        existingFeedbacks,
      ),
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

  private chunkCandidateHighlights(candidateHighlights: CandidateHighlight[]) {
    const batches: CandidateHighlight[][] = [];

    for (
      let index = 0;
      index < candidateHighlights.length;
      index += LINE_AUDIT_BATCH_SIZE
    ) {
      batches.push(
        candidateHighlights.slice(index, index + LINE_AUDIT_BATCH_SIZE),
      );
    }

    return batches;
  }

  private getBatchContext(
    candidateHighlights: CandidateHighlight[],
    batchIndex: number,
  ) {
    const start = Math.max(
      0,
      batchIndex * LINE_AUDIT_BATCH_SIZE - LINE_AUDIT_CONTEXT_OVERLAP,
    );
    const end = Math.min(
      candidateHighlights.length,
      (batchIndex + 1) * LINE_AUDIT_BATCH_SIZE + LINE_AUDIT_CONTEXT_OVERLAP,
    );

    return candidateHighlights.slice(start, end);
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

  private async runWithConcurrency<TInput, TResult>(
    items: TInput[],
    concurrency: number,
    worker: (item: TInput, index: number) => Promise<TResult>,
  ) {
    const results: TResult[] = [];
    let nextIndex = 0;

    async function runNext() {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= items.length) {
        return;
      }

      results[currentIndex] = await worker(items[currentIndex], currentIndex);
      await runNext();
    }

    await Promise.all(
      Array.from({ length: Math.min(concurrency, items.length) }, () =>
        runNext(),
      ),
    );

    return results;
  }

  private dedupeLineFeedbacks(
    feedbacks: ReturnType<typeof lineCvAuditResultSchema.parse>['detailed_feedbacks'],
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
          this.validateFeedbackAnchors(result, batch);
          await input.onLineBatchComplete?.({ ...event, result });
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
          'DeepSeek response did not match the line-level CV audit schema after repair.',
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
        'DeepSeek response did not match the coverage CV audit schema after repair.',
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
        'DEEPSEEK_API_KEY is missing in server/.env',
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
      input.target.jobDescription?.trim() || 'No employer job description provided.';

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
            '- Keep summary, general_feedbacks, job reasons, and general commentary in Vietnamese.',
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
              summary: 'Short Vietnamese summary.',
              score_breakdown: [
                {
                  dimension: 'Target alignment',
                  score: 20,
                  max_score: 35,
                  rationale:
                    'Vietnamese explanation based on CV evidence and findings.',
                },
                {
                  dimension: 'Evidence quality',
                  score: 12,
                  max_score: 20,
                  rationale:
                    'Vietnamese explanation based on projects, bullets, or experience evidence.',
                },
                {
                  dimension: 'ATS keyword coverage',
                  score: 8,
                  max_score: 15,
                  rationale:
                    'Vietnamese explanation based on target-specific keyword coverage.',
                },
              ],
              general_feedbacks: [
                {
                  id: 'gf_01',
                  topic: 'Overall positioning',
                  severity: 'warning',
                  comment:
                    'Vietnamese high-level comment that has no exact PDF line to highlight.',
                  recommendation:
                    'Vietnamese recommendation for the overall CV direction.',
                },
              ],
              suggested_keywords: ['Target Skill A', 'Target Skill B', 'Target Tool'],
              suggested_roles: ['Target Role A'],
              suggested_jobs: [
                {
                  title: 'Target Job A',
                  reason: 'Vietnamese explanation of why this job fits.',
                  match_level: 'high',
                },
                {
                  title: 'Target Job B',
                  reason: 'Vietnamese explanation of why this job fits.',
                  match_level: 'medium',
                },
                {
                  title: 'Adjacent Target Job',
                  reason: 'Vietnamese explanation of why this job is a stretch.',
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
    const targetSeniority =
      input.target.seniorityLevelName || 'not specified';
    const seniorityDescription =
      input.target.seniorityDescription ||
      'No seniority description provided.';
    const jobDescription =
      input.target.jobDescription?.trim() || 'No employer job description provided.';

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
            '- Every detailed_feedback item must include a non-empty suggestion. The suggestion must be a polished replacement in the same language as original_text.',
            '- Keep issue in Vietnamese. Keep suggestion in the dominant language of original_text.',
            '- If original_text is English, suggestion must be English only. Do not put Vietnamese explanations, Vietnamese parentheticals, or translated notes inside suggestion.',
            '- If original_text is Vietnamese, suggestion must be Vietnamese.',
            '- Suggestions must be truth-preserving. Do not invent years of experience, seniority, tools, certifications, metrics, leadership scope, or testing activities that are not supported by original_text or nearby context.',
            '- If the selected target requires evidence missing from the line, suggest a truthful rewrite using transferable evidence, or explicitly mark target-specific evidence as something to add only if true.',
            '- Never complain about missing spaces, extra spaces, letter spacing, joined words, kerning, or PDF extraction artifacts.',
            '- Treat isolated URL/link lines as valid evidence links unless the URL itself is semantically wrong or mislabeled.',
            '- Use red for critical target mismatch or misleading claims. Use yellow for improvements.',
            '- Avoid duplicate feedback for the same source_line_id unless there are truly separate issues.',
            '',
            'Return this exact JSON shape:',
            JSON.stringify({
              detailed_feedbacks: [
                {
                  id: 'fb_01',
                  source_line_id: batch[0]?.id || 'hl_001',
                  section: 'Dynamically inferred section name',
                  original_text: batch[0]?.text || 'Exact CV text span',
                  severity: 'warning',
                  issue: 'Vietnamese explanation of the issue.',
                  suggestion:
                    'Polished replacement text in the same language as original_text.',
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
    const targetSeniority =
      input.target.seniorityLevelName || 'not specified';
    const seniorityDescription =
      input.target.seniorityDescription ||
      'No seniority description provided.';
    const jobDescription =
      input.target.jobDescription?.trim() || 'No employer job description provided.';

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
            '- Every detailed_feedback item must include a non-empty suggestion in the same language as original_text.',
            '- Keep issue in Vietnamese. Keep suggestion in the dominant language of original_text.',
            '- If original_text is English, suggestion must be English only. Do not put Vietnamese explanations, Vietnamese parentheticals, or translated notes inside suggestion.',
            '- If original_text is Vietnamese, suggestion must be Vietnamese.',
            '- Suggestions must be truth-preserving and must not invent experience, tools, metrics, seniority, or testing work.',
            '- Do not complain about missing spaces, extra spaces, joined words, letter spacing, kerning, or PDF extraction artifacts.',
            '- Treat isolated URL/link lines as valid evidence links unless the URL itself is semantically wrong or mislabeled.',
            '- Use red for critical target mismatch or misleading claims. Use yellow for improvements.',
            '',
            'Return this exact JSON shape:',
            JSON.stringify({
              detailed_feedbacks: [
                {
                  id: 'fb_coverage_01',
                  source_line_id: batch[0]?.id || 'hl_001',
                  section: 'Dynamically inferred section name',
                  original_text: batch[0]?.text || 'Exact CV text span',
                  severity: 'warning',
                  issue: 'Vietnamese explanation of the missed issue.',
                  suggestion:
                    'Polished replacement text in the same language as original_text.',
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
            'Return only { "detailed_feedbacks": [...] }.',
            'Each detailed_feedback item must have source_line_id from this batch, original_text copied from that same line, and non-empty suggestion.',
            'If a source line has label plus content, original_text must include the content, not only the label.',
            'Keep issue in Vietnamese. Keep suggestion in the dominant language of original_text.',
            'If original_text is English, suggestion must be English only. Do not put Vietnamese explanations, Vietnamese parentheticals, or translated notes inside suggestion.',
            'If original_text is Vietnamese, suggestion must be Vietnamese.',
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
      throw new BadGatewayException('DeepSeek returned an empty response.');
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
        !this.isTextAnchoredToSourceLine(feedback.original_text, sourceLine.text)
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
          'DeepSeek feedback anchors are invalid.',
          ...invalidFeedbacks.slice(0, 20),
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
        `Invalid score_breakdown totals. max_score sum=${maxScore}, score sum=${score}, overall_score=${result.overall_score}.`,
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
    const originalLanguage = this.detectDominantLanguage(feedback.original_text);

    if (
      originalLanguage === 'english' &&
      this.containsVietnameseText(feedback.suggestion)
    ) {
      return 'suggestion mixes Vietnamese into an English CV line.';
    }

    return null;
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
    feedbacks: ReturnType<typeof lineCvAuditResultSchema.parse>['detailed_feedbacks'],
  ) {
    if (feedbacks.length === 0) {
      return '- No line-level findings were returned.';
    }

    return feedbacks
      .slice(0, 80)
      .map(
        (feedback, index) =>
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
}
