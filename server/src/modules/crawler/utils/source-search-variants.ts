export interface SourceSearchVariant {
  query: string;
  applySeniorityFilter: boolean;
}

export function buildSourceSearchVariants(
  queries: string[],
  hasSeniorityFilter: boolean,
): SourceSearchVariant[] {
  if (!hasSeniorityFilter) {
    return queries.map((query) => ({ query, applySeniorityFilter: false }));
  }

  return [
    ...queries.map((query) => ({ query, applySeniorityFilter: true })),
    ...queries.map((query) => ({ query, applySeniorityFilter: false })),
  ];
}
