export function normalizeText(value: unknown) {
  const text = toTextValue(value);

  if (!text) {
    return '';
  }

  return text
    .normalize('NFKC')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeSearchText(value: unknown) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function slugifyKeyword(value: string) {
  return normalizeSearchText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function uniqueNonEmpty(values: unknown) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of toValueList(values)) {
    const normalized = normalizeText(value);

    if (!normalized) {
      continue;
    }

    const key = normalizeSearchText(normalized);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function toTextValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(toTextValue).filter(Boolean).join(' ');
  }

  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .map(toTextValue)
      .filter(Boolean)
      .join(' ');
  }

  return String(value);
}

function toValueList(values: unknown) {
  if (values === null || values === undefined) {
    return [];
  }

  return Array.isArray(values) ? values : [values];
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
