import { normalizeSearchText, normalizeText } from './text-normalizer';

export type SeniorityGroup =
  'intern' | 'junior' | 'mid' | 'senior' | 'leadership';

interface SeniorityDefinition {
  group: SeniorityGroup;
  terms: string[];
}

const SENIORITY_DEFINITIONS: SeniorityDefinition[] = [
  {
    group: 'intern',
    terms: [
      'intern',
      'internship',
      'trainee',
      'thuc tap',
      'thực tập',
      'thuc tap sinh',
      'thực tập sinh',
    ],
  },
  {
    group: 'junior',
    terms: [
      'junior',
      'fresher',
      'entry level',
      'entry-level',
      'graduate',
      'new graduate',
      'moi tot nghiep',
      'mới tốt nghiệp',
      // NOTE: "nhân viên" (staff) is deliberately NOT a junior signal: VN
      // boards label nearly every IC posting that way, so it would reject all
      // entry jobs for an intern CV. Experience caps handle the filtering.
    ],
  },
  {
    group: 'mid',
    terms: [
      'middle',
      'mid',
      'mid level',
      'mid-level',
      'chuyen vien',
      'chuyên viên',
      '2 years',
      '3 years',
      '2 nam',
      '3 nam',
      '2 năm',
      '3 năm',
    ],
  },
  {
    group: 'senior',
    terms: [
      'senior',
      'sr',
      'experienced',
      'cao cap',
      'cao cấp',
      'chuyen gia',
      'chuyên gia',
      '4 years',
      '5 years',
      '4 nam',
      '5 nam',
      '4 năm',
      '5 năm',
    ],
  },
  {
    group: 'leadership',
    terms: [
      'lead',
      'leader',
      'team lead',
      'tech lead',
      'manager',
      'head',
      'director',
      'principal',
      'architect',
      'truong nhom',
      'trưởng nhóm',
      'truong phong',
      'trưởng phòng',
      'quan ly',
      'quản lý',
      'giam doc',
      'giám đốc',
    ],
  },
];

export function resolveSeniorityGroup(value: string | null | undefined) {
  const normalized = normalizeSearchText(value);

  if (!normalized) {
    return null;
  }

  return (
    SENIORITY_DEFINITIONS.find((definition) =>
      definition.terms.some((term) =>
        containsNormalizedPhrase(normalized, term),
      ),
    )?.group ?? null
  );
}

export function removeSeniorityPhrases(value: string | null | undefined) {
  let result = normalizeText(value);

  for (const definition of SENIORITY_DEFINITIONS) {
    for (const term of definition.terms) {
      result = result.replace(createPhraseRegex(term), ' ');
    }
  }

  return normalizeText(result);
}

export function evaluateSeniorityFit(input: {
  targetGroup: SeniorityGroup | null;
  titleText: string;
  explicitLevelText?: string | null;
  bodyText?: string | null;
}) {
  if (!input.targetGroup) {
    return { score: 0, accepted: true, matchedTerms: [] as string[] };
  }

  const titleGroups = resolveSeniorityGroups(input.titleText);
  const explicitGroups = resolveSeniorityGroups(input.explicitLevelText);
  const bodyGroups = resolveSeniorityGroups(input.bodyText);
  const directGroups = uniqueGroups([...titleGroups, ...explicitGroups]);
  const targetMatched =
    directGroups.includes(input.targetGroup) ||
    bodyGroups.includes(input.targetGroup);

  if (
    directGroups.length > 0 &&
    !isCompatibleSeniority(input.targetGroup, directGroups)
  ) {
    return {
      score: -55,
      accepted: false,
      matchedTerms: directGroups.map((group) => `seniority:${group}`),
    };
  }

  if (targetMatched) {
    return {
      score: 14,
      accepted: true,
      matchedTerms: [`seniority:${input.targetGroup}`],
    };
  }

  return { score: -4, accepted: true, matchedTerms: [] as string[] };
}

function resolveSeniorityGroups(value: string | null | undefined) {
  const normalized = normalizeSearchText(value);

  if (!normalized) {
    return [] as SeniorityGroup[];
  }

  return uniqueGroups(
    SENIORITY_DEFINITIONS.filter((definition) =>
      definition.terms.some((term) =>
        containsNormalizedPhrase(normalized, term),
      ),
    ).map((definition) => definition.group),
  );
}

function uniqueGroups(groups: SeniorityGroup[]) {
  return Array.from(new Set(groups));
}

function isCompatibleSeniority(
  targetGroup: SeniorityGroup,
  candidateGroups: SeniorityGroup[],
) {
  if (candidateGroups.includes(targetGroup)) {
    return true;
  }

  if (targetGroup === 'intern') {
    // Interns realistically target junior ("Nhân viên"/"Junior") postings;
    // only mid+ is clearly out of reach.
    return candidateGroups.every((group) =>
      ['intern', 'junior'].includes(group),
    );
  }

  if (targetGroup === 'junior') {
    return candidateGroups.every((group) =>
      ['intern', 'junior'].includes(group),
    );
  }

  if (targetGroup === 'mid') {
    return candidateGroups.every((group) => ['junior', 'mid'].includes(group));
  }

  if (targetGroup === 'senior') {
    return candidateGroups.every((group) =>
      ['mid', 'senior', 'leadership'].includes(group),
    );
  }

  return candidateGroups.every((group) =>
    ['senior', 'leadership'].includes(group),
  );
}

function containsNormalizedPhrase(normalizedValue: string, phrase: string) {
  return createPhraseRegex(phrase).test(normalizedValue);
}

function createPhraseRegex(phrase: string) {
  const flexibleWhitespace = normalizeSearchText(phrase)
    .split(/\s+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s+');

  return new RegExp(`(^|[^a-z0-9])${flexibleWhitespace}(?=$|[^a-z0-9])`, 'i');
}
