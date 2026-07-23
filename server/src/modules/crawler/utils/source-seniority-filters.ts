import type { JobSearchIntentPayload } from '../types/crawled-job.type';
import { resolveSeniorityGroup, type SeniorityGroup } from './seniority-intent';
import { normalizeSearchText } from './text-normalizer';

type SeniorityIntentSource = Pick<
  JobSearchIntentPayload,
  'seniorityLevelName' | 'targetRole'
>;

export function resolveTopCvPositionFilter(intent: SeniorityIntentSource) {
  const sourceText = normalizeSenioritySourceText(intent);
  const group = resolveSeniorityGroup(sourceText);

  if (!group) {
    return null;
  }

  if (group === 'intern') {
    return '50';
  }

  if (group === 'junior' || group === 'mid' || group === 'senior') {
    return '1';
  }

  if (sourceText.includes('pho giam doc')) {
    return '25';
  }

  if (sourceText.includes('giam doc') || sourceText.includes('director')) {
    return '30';
  }

  if (sourceText.includes('truong chi nhanh')) {
    return '20';
  }

  if (sourceText.includes('quan ly') || sourceText.includes('manager')) {
    return '10';
  }

  if (sourceText.includes('phong')) {
    return '3';
  }

  return '2';
}

export function resolveVietnamWorksLevelFilter(intent: SeniorityIntentSource) {
  const sourceText = normalizeSenioritySourceText(intent);
  const group = resolveSeniorityGroup(sourceText);

  if (!group) {
    return null;
  }

  if (group === 'intern') {
    return '8';
  }

  if (isFreshGraduate(sourceText)) {
    return '1';
  }

  if (group === 'junior' || group === 'mid' || group === 'senior') {
    return '5';
  }

  if (sourceText.includes('giam doc') || sourceText.includes('director')) {
    return '3';
  }

  return '7';
}

export function resolveIndeedSearchParams(intent: SeniorityIntentSource) {
  const group = resolveSeniorityGroup(normalizeSenioritySourceText(intent));

  if (group !== 'intern') {
    return {};
  }

  return {
    sc: '0kf:jt(internship);',
  };
}

export function resolveSeniorityGroupForSource(intent: SeniorityIntentSource) {
  return resolveSeniorityGroup(normalizeSenioritySourceText(intent));
}

function normalizeSenioritySourceText(intent: SeniorityIntentSource) {
  return normalizeSearchText(
    [intent.seniorityLevelName, intent.targetRole].join(' '),
  );
}

function isFreshGraduate(sourceText: string) {
  return ['fresher', 'fresh graduate', 'new graduate', 'moi tot nghiep'].some(
    (term) => sourceText.includes(term),
  );
}
