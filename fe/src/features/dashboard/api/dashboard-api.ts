import { apiClient } from '@/shared/lib/api-client'
import type { UserDashboard } from '../types/dashboard.types'

export async function getUserDashboard() { return (await apiClient.get<UserDashboard>('/dashboard/me')).data }
