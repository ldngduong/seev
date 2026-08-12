import { Skeleton } from '@/shared/components/ui/skeleton'

export function JobFeedSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-64 rounded-2xl" />
      ))}
    </div>
  )
}
