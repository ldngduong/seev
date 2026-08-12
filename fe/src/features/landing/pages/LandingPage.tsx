import { LandingCtaSection } from '../components/LandingCtaSection'
import { LandingHeroSection } from '../components/LandingHeroSection'
import { LandingNavigation } from '../components/LandingNavigation'
import { LandingProblemSection } from '../components/LandingProblemSection'
import { LandingSolutionSection } from '../components/LandingSolutionSection'

export const LandingPage = () => {
  return (
    <main className="bg-background">
      <LandingNavigation />

      <section className="relative isolate min-h-screen w-full bg-[#f8fafc]">
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, #e2e8f0 1px, transparent 1px),
              linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px',
            WebkitMaskImage:
              'radial-gradient(ellipse 62% 58% at 50% 0%, #000 55%, transparent 100%)',
            maskImage:
              'radial-gradient(ellipse 62% 58% at 50% 0%, #000 55%, transparent 100%)',
          }}
        />
        <div className="relative z-10 min-h-screen">
          <LandingHeroSection />
        </div>
      </section>

      <LandingProblemSection />
      <LandingSolutionSection />
      <LandingCtaSection />
    </main>
  )
}
