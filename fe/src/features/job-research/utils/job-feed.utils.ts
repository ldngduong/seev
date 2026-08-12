import type { SeniorityLevel } from '@/entities/career-taxonomy/types/career-taxonomy.types'

export const JOB_FEED_PAGE_SIZE = 18

export function createSeniorityOptions(levels: SeniorityLevel[]) {
  return [
    { value: 'all', label: 'Tất cả cấp bậc' },
    ...levels.map((level) => ({
      value: level.id,
      label: level.displayName,
    })),
  ]
}

export function isDisplayableSkill(value: string) {
  const skill = value.trim()

  return (
    skill.length > 0 &&
    skill.length <= 40 &&
    skill.split(/\s+/).length <= 6 &&
    !/[<>]/.test(skill) &&
    !/&(?:lt|gt|nbsp|amp);/i.test(skill) &&
    !/(?:class|style|span|div|br|icon|fa-solid|verified)\s*=/i.test(skill) &&
    !/(nhà tuyển dụng|đã xác thực|giấy phép kinh doanh|tài khoản ntd|địa điểm làm việc|danh mục hành chính|hãy đăng nhập)/i.test(skill)
  )
}

export function formatJobContent(value: string | null | undefined) {
  if (!value) return ''
  const doc = new DOMParser().parseFromString(value, 'text/html')
  doc.querySelectorAll('script, style, noscript').forEach((element) => element.remove())
  doc.querySelectorAll('br').forEach((element) => element.replaceWith('\n'))
  doc.querySelectorAll('li').forEach((element) => element.append('\n'))
  return (doc.body.textContent || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function formatJobType(value: string) {
  return (
    {
      full_time: 'Toàn thời gian',
      part_time: 'Bán thời gian',
      internship: 'Thực tập',
      contract: 'Hợp đồng',
      freelance: 'Freelance',
    } as Record<string, string>
  )[value] ?? value
}
