import axios from 'axios'

export function getApiErrorMessage(error: unknown, fallback = 'Không thể hoàn tất thao tác. Vui lòng thử lại.') {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message
    if (typeof message === 'string' && message.trim()) return message
    if (Array.isArray(message)) return message.filter((item): item is string => typeof item === 'string').join(', ')
    if (!error.response) return 'Không thể kết nối tới máy chủ. Vui lòng thử lại.'
  }
  if (error instanceof Error && error.message.trim()) return error.message
  return fallback
}
