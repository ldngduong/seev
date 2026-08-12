const FORBIDDEN_SKILL_TEXT = [
  'nhà tuyển dụng',
  'đã xác thực',
  'giấy phép kinh doanh',
  'tài khoản ntd',
  'địa điểm làm việc',
  'danh mục hành chính',
  'hãy đăng nhập',
];

export function sanitizeJobSkills(values: string[]): string[] {
  const seen = new Set<string>();
  return values.flatMap((value) => {
    const skill = value.trim().replace(/\s+/g, ' ');
    const lowered = skill.toLocaleLowerCase('vi');
    if (
      !skill ||
      skill.length > 60 ||
      skill.split(/\s+/).length > 8 ||
      /<\/?[a-z][^>]*>|&(?:lt|gt|nbsp|amp);/i.test(skill) ||
      FORBIDDEN_SKILL_TEXT.some((phrase) => lowered.includes(phrase)) ||
      seen.has(lowered)
    ) {
      return [];
    }
    seen.add(lowered);
    return [skill];
  });
}

export function sanitizeJobContent(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/<(?:br|\/p|\/li|\/ul|\/ol|\/div|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
