import { apiClient } from '@/shared/lib/api-client'
import type { ActivityLog, AdminDashboard, AdminUser, AdminUserDetail, CrawlRun, CrawlRunDetail, CreditTransaction, ExternalQuota, NewAccountCreditsSetting, PageResponse, QueueOverview, ServiceProduct } from '../types/admin.types'

export async function getAdminDashboard() { return (await apiClient.get<AdminDashboard>('/admin/dashboard')).data }
export async function getAdminUsers(params: { page: number; search?: string }) { return (await apiClient.get<PageResponse<AdminUser>>('/admin/users', { params })).data }
export async function getAdminUser(id: string) { return (await apiClient.get<AdminUserDetail>(`/admin/users/${id}`)).data }
export async function getAdminUserCreditHistory(id: string, page: number) { return (await apiClient.get<PageResponse<CreditTransaction>>(`/admin/users/${id}/credit-history`, { params: { page } })).data }
export async function getAdminUserActivities(id: string, page: number) { return (await apiClient.get<PageResponse<ActivityLog>>(`/admin/users/${id}/activities`, { params: { page } })).data }
export async function adjustUserCredits(id: string, input: { amount: number; reason: string; idempotencyKey: string }) { return (await apiClient.post(`/admin/users/${id}/credits`, input)).data }
export async function getServices() { return (await apiClient.get<ServiceProduct[]>('/admin/services')).data }
export async function updateServicePrice(id: string, priceCredits: number) { return (await apiClient.patch<ServiceProduct>(`/admin/services/${id}`, { priceCredits })).data }
export async function getExternalQuotas() { return (await apiClient.get<{ providers: ExternalQuota[]; fetched_at: string }>('/admin/external-quotas')).data }
export async function getNewAccountCredits() { return (await apiClient.get<NewAccountCreditsSetting>('/admin/settings/new-account-credits')).data }
export async function updateNewAccountCredits(input: Pick<NewAccountCreditsSetting, 'enabled' | 'credits'>) { return (await apiClient.patch<NewAccountCreditsSetting>('/admin/settings/new-account-credits', input)).data }
export async function getCrawlRuns(page = 1, triggerType?: 'manual' | 'scheduled') { return (await apiClient.get<PageResponse<CrawlRun>>('/admin/crawls', { params: { page, triggerType } })).data }
export async function getCrawlRun(id: string) { return (await apiClient.get<CrawlRunDetail>(`/admin/crawls/${id}`)).data }
export async function getCrawlQueue() { return (await apiClient.get<QueueOverview>('/admin/crawls/queue')).data }
export async function triggerCrawl(forceRetry = false) { return (await apiClient.post('/admin/crawls/run', { forceRetry })).data }
export async function cancelCrawl(id: string) { return (await apiClient.post(`/admin/crawls/${id}/cancel`)).data }
export async function removeQueueJob(jobId: string) { return (await apiClient.delete(`/admin/crawls/queue/${encodeURIComponent(jobId)}`)).data }
