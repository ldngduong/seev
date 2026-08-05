import { createHash } from 'node:crypto';

export function createContentHash(parts: Array<string | null | undefined>) {
  return createHash('sha256')
    .update(parts.filter(Boolean).join('\n'))
    .digest('hex');
}
