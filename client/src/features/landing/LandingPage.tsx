import { LandingCtaSection } from './components/LandingCtaSection'
import { LandingHeroSection } from './components/LandingHeroSection'
import { LandingNavigation } from './components/LandingNavigation'
import { LandingProblemSection } from './components/LandingProblemSection'
import { LandingSolutionSection } from './components/LandingSolutionSection'

export const LandingPage = () => {
  return (
    <main className="flex flex-col gap-2">
      <LandingNavigation />
      <LandingHeroSection />
      <LandingProblemSection />
      <LandingSolutionSection />
      <LandingCtaSection />
    </main>
  )
}
