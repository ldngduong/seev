import { JobFeedPage } from '@/features/job-research/pages/JobFeedPage'
import { LandingFooter } from '../components/LandingFooter'
import { LandingNavigation } from '../components/LandingNavigation'

export function PublicJobsPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNavigation />
      <main className="px-6 pb-12 pt-28">
        <JobFeedPage publicMode />
      </main>
      <LandingFooter />
    </div>
  )
}
