import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { getCrawlRun } from '../api/admin-api'
export function useAdminCrawlDetail() { const { crawlId = '' } = useParams(); const query = useQuery({ queryKey: ['admin', 'crawl', crawlId], queryFn: () => getCrawlRun(crawlId), enabled: Boolean(crawlId), refetchInterval: (state) => ['queued', 'processing'].includes(state.state.data?.status ?? '') ? 5_000 : false }); return { run: query.data, isLoading: query.isLoading } }
