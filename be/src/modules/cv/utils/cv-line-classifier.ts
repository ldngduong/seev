const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const URL_PATTERN = /\b(?:https?:\/\/|www\.)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s|,;]*)?/gi;
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{7,}\d)/g;
const LINK_METADATA_LABELS = /\b(?:github|gitlab|bitbucket|linkedin|portfolio|website|web|site|demo|live|link|email|e-mail|phone|mobile|contact)\b/gi;

export function isNeutralCvLinkOrContactLine(value: string) {
  const text = value.trim();
  if (!text) return false;

  const hasLinkOrContact =
    new RegExp(EMAIL_PATTERN.source, 'i').test(text) ||
    new RegExp(URL_PATTERN.source, 'i').test(text) ||
    new RegExp(PHONE_PATTERN.source).test(text);
  if (!hasLinkOrContact) return false;

  const remainingWords = text
    .replace(EMAIL_PATTERN, ' ')
    .replace(URL_PATTERN, ' ')
    .replace(PHONE_PATTERN, ' ')
    .replace(LINK_METADATA_LABELS, ' ')
    .replace(/[^\p{L}\p{N}+#]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return remainingWords.length <= 2;
}
