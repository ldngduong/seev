import { JobFeedPage } from '@/features/job-research/pages/JobFeedPage'
import { LandingFooter } from '../components/LandingFooter'
import { LandingNavigation } from '../components/LandingNavigation'

export function PublicJobsPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNavigation />
      <main className="px-4 pb-12 pt-24 sm:px-6 sm:pt-28">
        <JobFeedPage publicMode />
      </main>
      <LandingFooter />
    </div>
  )
}
