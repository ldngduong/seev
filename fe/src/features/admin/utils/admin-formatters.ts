import type { ActivityLog } from '../types/admin.types'

const transactionLabels: Record<string, string> = {
  opening_balance: 'Số dư ban đầu',
  admin_grant: 'Cộng credit',
  admin_deduct: 'Trừ credit',
  service_reserve: 'Tạm giữ phí dịch vụ',
  service_charge: 'Thanh toán dịch vụ',
  refund: 'Hoàn credit',
}

const activityLabels: Record<string, string> = {
  'auth.registered': 'Tạo tài khoản',
  'auth.logged_in': 'Đăng nhập',
  'cv.uploaded': 'Tải CV lên',
  'research.created': 'Tạo phiên nghiên cứu',
  'research.completed': 'Hoàn tất nghiên cứu',
  'research.failed': 'Nghiên cứu thất bại',
  'admin.credit_adjusted': 'Điều chỉnh số dư',
  'admin.service_price_updated': 'Cập nhật giá dịch vụ',
  'admin.new_account_credits_updated': 'Cập nhật credit tài khoản mới',
}

export function formatTransactionType(type: string) { return transactionLabels[type] ?? 'Giao dịch credit' }
export function formatActivityAction(action: string) { return activityLabels[action] ?? 'Hoạt động hệ thống' }
export function formatUserRole(role: 'user' | 'admin') { return role === 'admin' ? 'Quản trị viên' : 'Người dùng' }

export function describeActivity(item: ActivityLog) {
  const metadata = item.metadata
  if (item.action === 'admin.credit_adjusted') {
    const amount = Number(metadata.amount ?? 0)
    const operation = amount >= 0 ? `Cộng ${amount} credit` : `Trừ ${Math.abs(amount)} credit`
    return metadata.reason ? `${operation} · Lý do: ${String(metadata.reason)}` : operation
  }
  if (item.action === 'cv.uploaded') return metadata.file_name ? `Tệp ${String(metadata.file_name)}` : null
  if (item.action.startsWith('research.')) return metadata.type ? `Chế độ ${metadata.type === 'quick' ? 'nhanh' : 'tùy chỉnh'}` : null
  return null
}

export function describeCron(pattern: string) {
  const parts = pattern.trim().split(/\s+/)
  if (parts.length === 5 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1]) && parts.slice(2).every((part) => part === '*')) {
    return `Hằng ngày lúc ${parts[1].padStart(2, '0')}:${parts[0].padStart(2, '0')}`
  }
  return 'Chạy tự động theo lịch đã cấu hình'
}
