import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/shared/lib/api-error'
import { adminSocket } from '../api/admin-socket'
import { cancelCrawl, getCrawlQueue, getCrawlRuns, removeQueueJob, triggerCrawl } from '../api/admin-api'
import type { CrawlProgressEvent, CrawlRun } from '../types/admin.types'

export function useAdminCrawls() {
  const client = useQueryClient(); const [page, setPage] = useState(1)
  const [type, setTypeState] = useState<'manual' | 'scheduled'>('manual')
  const runs = useQuery({ queryKey: ['admin', 'crawls', type, page], queryFn: () => getCrawlRuns(page, type), refetchInterval: 15_000 })
  const queue = useQuery({ queryKey: ['admin', 'crawl-queue'], queryFn: getCrawlQueue, refetchInterval: 10_000 })
  const trigger = useMutation({ mutationFn: triggerCrawl, onSuccess: refresh })
  const cancel = useMutation({ mutationFn: cancelCrawl, onSuccess: refresh })
  const remove = useMutation({
    mutationFn: removeQueueJob,
    onSuccess: () => { toast.success('Đã gỡ tác vụ khỏi hàng đợi.'); refresh() },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Không thể gỡ tác vụ khỏi hàng đợi.')),
  })
  function refresh() { void client.invalidateQueries({ queryKey: ['admin', 'crawls'] }); void client.invalidateQueries({ queryKey: ['admin', 'crawl-queue'] }) }
  useEffect(() => {
    const onProgress = (event: CrawlProgressEvent) => {
      let found = false
      client.setQueriesData<{ items: CrawlRun[] }>({ queryKey: ['admin', 'crawls'] }, (current) => current ? { ...current, items: current.items.map((run) => {
        if (run.id !== event.run_id) return run
        found = true
        return {
          ...run,
          status: event.status,
          phase: event.phase,
          progress: event.progress,
          progress_message: event.message,
          total_targets: event.total_targets,
          completed_targets: event.completed_targets,
          failed_targets: event.failed_targets,
          total_jobs: event.total_jobs,
          saved_jobs: event.saved_jobs,
          current_source: event.current_source,
          current_category: event.current_category,
          cancel_requested: event.cancel_requested,
          updated_at: event.updated_at,
        }
      }) } : current)
      if (!found) void client.invalidateQueries({ queryKey: ['admin', 'crawls'] })
      void client.invalidateQueries({ queryKey: ['admin', 'crawl-queue'] })
    }
    adminSocket.on('crawl:progress', onProgress); adminSocket.connect()
    return () => { adminSocket.off('crawl:progress', onProgress); adminSocket.disconnect() }
  }, [client])
  function setType(next: 'manual' | 'scheduled') { setTypeState(next); setPage(1) }
  return { runs: runs.data?.items ?? [], meta: runs.data?.meta, queue: queue.data, page, setPage, type, setType, trigger: trigger.mutate, isTriggering: trigger.isPending, cancel: cancel.mutate, isCancelling: cancel.isPending, remove: remove.mutate, refresh }
}
