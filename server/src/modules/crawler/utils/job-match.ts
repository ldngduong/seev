import type { JobPost } from '../entities/job-post.entity';
import {
  evaluateSeniorityFit,
  removeSeniorityPhrases,
  resolveSeniorityGroup,
  type SeniorityGroup,
} from './seniority-intent';
import { clamp, normalizeSearchText, uniqueNonEmpty } from './text-normalizer';

export const MIN_JOB_MATCH_SCORE = 18;

export interface JobMatchProfile {
  occupationPhrases: string[];
  occupationTerms: string[];
  rankingTerms: string[];
  seniorityGroup: SeniorityGroup | null;
}

export interface JobMatchIntent {
  targetRole: string | null;
  jobCategoryName: string | null;
  seniorityLevelName: string | null;
  keywords: string[];
  searchQueries: string[];
}

export interface JobMatchResult {
  score: number;
  terms: string[];
  accepted: boolean;
}

const GRAMMATICAL_TERMS = new Set([
  'a',
  'an',
  'and',
  'for',
  'in',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with',
]);

export function buildJobMatchProfile(intent: JobMatchIntent): JobMatchProfile {
  const target = removeSeniorityPhrases(intent.targetRole);
  const minimumAliasTerms = Math.min(
    2,
    Math.max(1, tokenizeMeaningfulTerms(target).length),
  );
  const queryPhrases = intent.searchQueries
    .map((query) => removeSeniorityPhrases(query))
    .filter(
      (query) => tokenizeMeaningfulTerms(query).length >= minimumAliasTerms,
    );
  const occupationPhrases = uniqueNonEmpty([
    target,
    ...queryPhrases,
    target ? null : intent.jobCategoryName,
  ]).map(normalizeSearchText);
  const occupationTerms = tokenizeMeaningfulTerms(target);
  const rankingTerms = uniqueNonEmpty(intent.keywords)
    .map(normalizeSearchText)
    .filter((term) => term.length >= 2);

  return {
    occupationPhrases,
    occupationTerms,
    rankingTerms,
    seniorityGroup: resolveSeniorityGroup(
      [intent.seniorityLevelName, intent.targetRole].join(' '),
    ),
  };
}

export function scoreJobMatch(
  profile: JobMatchProfile,
  jobPost: Pick<
    JobPost,
    | 'title'
    | 'searchText'
    | 'seniorityText'
    | 'description'
    | 'requirements'
    | 'benefits'
  >,
): JobMatchResult {
  const normalizedTitle = normalizeSearchText(jobPost.title);
  const normalizedSearch = normalizeSearchText(jobPost.searchText);
  const exactTitlePhrases = profile.occupationPhrases.filter((phrase) =>
    containsPhrase(normalizedTitle, phrase),
  );
  const titleTerms = profile.occupationTerms.filter((term) =>
    containsPhrase(normalizedTitle, term),
  );
  const documentTerms = profile.occupationTerms.filter((term) =>
    containsPhrase(normalizedSearch, term),
  );
  const requiredTitleTerms = Math.max(
    1,
    Math.ceil(profile.occupationTerms.length * 0.67),
  );
  const hasOccupationEvidence =
    exactTitlePhrases.length > 0 ||
    (profile.occupationTerms.length > 0 &&
      titleTerms.length >= requiredTitleTerms);

  if (!hasOccupationEvidence) {
    return { score: 0, terms: [], accepted: false };
  }

  const matchedTerms = uniqueNonEmpty([
    ...exactTitlePhrases,
    ...titleTerms,
    ...documentTerms,
  ]);
  let score = 0;

  if (exactTitlePhrases.length > 0) {
    score += 48;
  } else if (titleTerms.length >= requiredTitleTerms) {
    score += 34;
  } else {
    score += 34;
  }

  for (const term of profile.rankingTerms) {
    if (containsPhrase(normalizedTitle, term)) {
      score += 5;
      matchedTerms.push(term);
    } else if (containsPhrase(normalizedSearch, term)) {
      score += 2;
      matchedTerms.push(term);
    }
  }

  const seniorityFit = evaluateSeniorityFit({
    targetGroup: profile.seniorityGroup,
    titleText: jobPost.title,
    explicitLevelText: jobPost.seniorityText,
    bodyText: [
      jobPost.description,
      jobPost.requirements,
      jobPost.benefits,
    ].join(' '),
  });

  if (!seniorityFit.accepted) {
    return {
      score: 0,
      terms: uniqueNonEmpty([...matchedTerms, ...seniorityFit.matchedTerms]),
      accepted: false,
    };
  }

  score += seniorityFit.score;
  matchedTerms.push(...seniorityFit.matchedTerms);

  const finalScore = clamp(score, 0, 100);

  return {
    score: finalScore,
    terms: uniqueNonEmpty(matchedTerms),
    accepted: finalScore >= MIN_JOB_MATCH_SCORE,
  };
}

function tokenizeMeaningfulTerms(value: string | null | undefined) {
  return uniqueNonEmpty(
    normalizeSearchText(value)
      .split(/\s+/)
      .filter((term) => term.length >= 2 && !GRAMMATICAL_TERMS.has(term)),
  );
}

function containsPhrase(text: string, phrase: string) {
  if (!text || !phrase) {
    return false;
  }

  const pattern = phrase
    .split(/\s+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s+');

  return new RegExp(`(^|[^a-z0-9])${pattern}(?=$|[^a-z0-9])`, 'i').test(text);
}
