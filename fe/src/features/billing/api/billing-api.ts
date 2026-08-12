import { apiClient } from '@/shared/lib/api-client'
import type { BillingAccount, BillingProduct } from '../types/billing.types'
export async function getBillingAccount() { return (await apiClient.get<BillingAccount>('/billing/me')).data }
export async function getBillingCatalog() { return (await apiClient.get<BillingProduct[]>('/billing/catalog')).data }
