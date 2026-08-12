import { useEffect, useRef } from 'react'

import { researchSocket } from '@/features/cv-research/api/research-socket'
import type { ResearchProgressEvent } from '@/features/cv-research/types/research-progress.types'

export function useResearchProgress(
  onProgress: (event: ResearchProgressEvent) => void,
  onReconnect?: () => void,
) {
  const progressRef = useRef(onProgress)
  const reconnectRef = useRef(onReconnect)
  progressRef.current = onProgress
  reconnectRef.current = onReconnect

  useEffect(() => {
    const handleProgress = (event: ResearchProgressEvent) =>
      progressRef.current(event)
    const handleConnect = () => reconnectRef.current?.()
    researchSocket.on('research:progress', handleProgress)
    researchSocket.on('connect', handleConnect)
    researchSocket.connect()

    return () => {
      researchSocket.off('research:progress', handleProgress)
      researchSocket.off('connect', handleConnect)
    }
  }, [])
}
