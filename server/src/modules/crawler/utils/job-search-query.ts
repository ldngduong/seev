import type { JobSearchIntentPayload } from '../types/crawled-job.type';
import { normalizeText, uniqueNonEmpty } from './text-normalizer';

export function resolveJobSearchQueries(
  intent: Pick<
    JobSearchIntentPayload,
    | 'searchQueries'
    | 'jobCategoryName'
    | 'keywords'
    | 'targetRole'
    | 'seniorityLevelName'
  >,
  limit = 8,
) {
  const targetWithoutParentheses = stripParenthetical(intent.targetRole);
  const categoryWithoutParentheses = stripParenthetical(intent.jobCategoryName);
  const targetWithoutSeniority = removeExactPhrase(
    targetWithoutParentheses,
    intent.seniorityLevelName,
  );
  const normalizedKeywords = (intent.keywords ?? []).flatMap((keyword) => [
    stripParenthetical(keyword),
    keyword,
  ]);

  return uniqueNonEmpty([
    ...(intent.searchQueries ?? []),
    targetWithoutSeniority,
    categoryWithoutParentheses,
    intent.jobCategoryName,
    ...normalizedKeywords,
    intent.targetRole,
  ]).slice(0, limit);
}

function stripParenthetical(value: string | null | undefined) {
  return normalizeText(value).replace(/\([^)]*\)/g, ' ');
}

function removeExactPhrase(
  value: string | null | undefined,
  phrase: string | null | undefined,
) {
  const normalizedValue = normalizeText(value);
  const normalizedPhrase = normalizeText(phrase);

  if (!normalizedValue || !normalizedPhrase) {
    return normalizedValue;
  }

  return normalizeText(
    normalizedValue.replace(
      new RegExp(`(^|\\s)${escapeRegExp(normalizedPhrase)}(?=\\s|$)`, 'gi'),
      ' ',
    ),
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
