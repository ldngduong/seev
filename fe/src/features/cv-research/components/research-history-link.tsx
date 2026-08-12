import { Link } from 'react-router'

import { buttonVariants } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'

export function ResearchHistoryLink() {
  return <Link to="/research-history" className={cn(buttonVariants({ variant: 'outline' }))}>Quay lại lịch sử</Link>
}
