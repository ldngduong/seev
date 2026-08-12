import { Search } from 'lucide-react'
import { Link } from 'react-router'

import { DataPagination } from '@/shared/components/data/DataPagination'
import { Input } from '@/shared/components/ui/input'
import { AdminPage } from '../components/admin-page'
import { useAdminUsers } from '../hooks/use-admin-users'
import { formatUserRole } from '../utils/admin-formatters'

export function AdminUsersPage() {
  const state = useAdminUsers()
  return <AdminPage title="Người dùng" description="Quản lý tài khoản, số dư và lịch sử sử dụng dịch vụ.">
    <label className="relative max-w-xl"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={state.search} onChange={(event) => state.setSearch(event.target.value)} className="pl-9" placeholder="Tìm theo tên, email hoặc tên đăng nhập" /></label>
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card"><table className="w-full text-sm"><thead className="border-b border-border/60 text-left text-muted-foreground"><tr><th className="px-4 py-3 font-medium">Người dùng</th><th className="px-4 py-3 font-medium">Vai trò</th><th className="px-4 py-3 text-right font-medium">Số dư</th><th className="px-4 py-3 font-medium">Ngày tham gia</th></tr></thead><tbody className="divide-y divide-border/60">{state.users.map((user) => <tr key={user.id} className="transition-colors hover:bg-muted/30"><td className="px-4 py-3"><Link className="font-medium text-zinc-800 hover:text-primary" to={`/admin/users/${user.id}`}>{user.full_name}</Link><p className="mt-0.5 text-xs text-muted-foreground">{user.email}</p></td><td className="px-4 py-3"><span className="rounded-full bg-muted px-2.5 py-1 text-xs text-zinc-600">{formatUserRole(user.role)}</span></td><td className="px-4 py-3 text-right font-medium tabular-nums">{user.credits} credit</td><td className="px-4 py-3 text-muted-foreground">{new Date(user.created_at).toLocaleDateString('vi-VN')}</td></tr>)}</tbody></table></div>
    {state.meta ? <DataPagination page={state.meta.page} totalPages={state.meta.total_pages} total={state.meta.total} onPageChange={state.setPage} /> : null}
  </AdminPage>
}
