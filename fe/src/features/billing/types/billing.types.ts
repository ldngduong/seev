export interface BillingAccount { balance: string }
export interface BillingProduct { id: string; code: 'quick_research' | 'manual_research' | 'job_fit_analysis' | 'external_jd_research' | 'external_link_research' | 'job_suggestion_retry'; name: string; description: string | null; price_credits: string; is_active: boolean; version: number }
