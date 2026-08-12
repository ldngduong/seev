import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { adminSocket } from '../api/admin-socket'
import { cancelCrawl, getCrawlQueue, getCrawlRuns, removeQueueJob, triggerCrawl } from '../api/admin-api'
import type { CrawlProgressEvent, CrawlRun } from '../types/admin.types'

export function useAdminCrawls() {
  const client = useQueryClient(); const [page, setPage] = useState(1)
  const runs = useQuery({ queryKey: ['admin', 'crawls', page], queryFn: () => getCrawlRuns(page), refetchInterval: 15_000 })
  const queue = useQuery({ queryKey: ['admin', 'crawl-queue'], queryFn: getCrawlQueue, refetchInterval: 10_000 })
  const trigger = useMutation({ mutationFn: triggerCrawl, onSuccess: refresh })
  const cancel = useMutation({ mutationFn: cancelCrawl, onSuccess: refresh })
  const remove = useMutation({ mutationFn: removeQueueJob, onSuccess: refresh })
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
  return { runs: runs.data?.items ?? [], meta: runs.data?.meta, queue: queue.data, page, setPage, trigger: trigger.mutate, isTriggering: trigger.isPending, cancel: cancel.mutate, isCancelling: cancel.isPending, remove: remove.mutate, refresh }
}
