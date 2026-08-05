import type { CandidateHighlight } from '../../cv/interfaces/parsed-resume.interface';

export interface AuditUnitOptions {
  maxLines: number;
  targetCharacters: number;
}

export function buildAuditUnits(
  lines: readonly CandidateHighlight[],
  options: AuditUnitOptions,
) {
  const units: CandidateHighlight[][] = [];
  let current: CandidateHighlight[] = [];
  let characterCount = 0;

  const flush = () => {
    if (current.length === 0) return;
    units.push(current);
    current = [];
    characterCount = 0;
  };

  for (const line of lines) {
    const previous = current.at(-1);
    const changesPage = Boolean(
      previous && previous.pageNumber !== line.pageNumber,
    );
    const reachesHardLimit = current.length >= options.maxLines;
    const exceedsTarget =
      current.length > 0 &&
      characterCount + line.text.length > options.targetCharacters;
    const reachesNaturalBoundary =
      current.length > 0 &&
      characterCount >= options.targetCharacters * 0.45 &&
      looksLikeStructuralBoundary(line.text);

    if (
      changesPage ||
      reachesHardLimit ||
      exceedsTarget ||
      reachesNaturalBoundary
    ) {
      flush();
    }

    current.push(line);
    characterCount += line.text.length;
  }

  flush();
  return units;
}

function looksLikeStructuralBoundary(text: string) {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/);
  const letters = trimmed.replace(/[^A-Za-zÀ-ỹ]/g, '');
  const uppercaseLetters = letters.replace(/[^A-ZÀ-Ỹ]/g, '');
  const uppercaseRatio = letters.length
    ? uppercaseLetters.length / letters.length
    : 0;

  return (
    /^\d+[.)]\s+\S/.test(trimmed) ||
    /^[^:]{2,48}:\s*$/.test(trimmed) ||
    (words.length <= 7 && letters.length >= 4 && uppercaseRatio >= 0.75)
  );
}
