import type { JobSearchIntentPayload } from '../types/crawled-job.type';
import { removeSeniorityPhrases } from './seniority-intent';
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
  limit = 12,
) {
  const targetWithoutParentheses = stripParenthetical(intent.targetRole);
  const categoryWithoutParentheses = stripParenthetical(intent.jobCategoryName);
  const roleWithoutSeniority = removeSeniorityPhrases(
    removeExactPhrase(targetWithoutParentheses, intent.seniorityLevelName),
  );
  const normalizedSearchQueries = (intent.searchQueries ?? []).map((query) =>
    removeSeniorityPhrases(
      removeExactPhrase(stripParenthetical(query), intent.seniorityLevelName),
    ),
  );
  const normalizedKeywords = (intent.keywords ?? []).flatMap((keyword) => {
    const withoutParentheses = stripParenthetical(keyword);
    const withoutSeniority = removeSeniorityPhrases(
      removeExactPhrase(withoutParentheses, intent.seniorityLevelName),
    );

    return [withoutSeniority, withoutParentheses, keyword];
  });

  return uniqueNonEmpty([
    ...normalizedSearchQueries,
    roleWithoutSeniority,
    categoryWithoutParentheses,
    intent.jobCategoryName,
    ...normalizedKeywords,
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
