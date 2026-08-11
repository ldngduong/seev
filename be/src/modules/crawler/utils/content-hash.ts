import { createHash } from 'node:crypto';

// md5 (32 ký tự hex) để khớp cột dedup_key varchar(32) và dữ liệu cũ đã
// được fill bằng md5 trong migration AddJobPostDedupKey. Dedup không cần
// bảo mật nên md5 là đủ an toàn về xác suất trùng.
export function createContentHash(parts: Array<string | null | undefined>) {
  return createHash('md5')
    .update(parts.filter(Boolean).join('\n'))
    .digest('hex');
}
