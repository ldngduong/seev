import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router'

const navigationItems = ['Product', 'Scoring', 'Career fit']

export const LandingNavigation = () => {
  return (
    <header className="flex items-center justify-between rounded-4xl bg-card px-3">
      <div className="flex items-center gap-2">
        <img className='h-12' src="/logo.png"></img>
        <Link to="/" className="text-xl font-semibold tracking-normal">
        Seev
        </Link>

      </div>

      <nav className="hidden items-center gap-1 rounded-4xl bg-primary p-2 md:flex">
        {navigationItems.map((item) => (
          <a
            key={item}
            href={`#${item.toLowerCase().replaceAll(' ', '-')}`}
            className="rounded-4xl px-3 py-1 font-bold text-background transition-colors hover:bg-background hover:text-foreground"
          >
            {item}
          </a>
        ))}
      </nav>

      <Link
        to="/login"
        className="rounded-4xl bg-primary p-2"
      >
        <span className='rounded-4xl px-3 py-1 flex items-center gap-1 font-bold text-background hover:bg-background hover:text-foreground'>
          Try seev    
          <ArrowUpRight />
        </span>
      </Link>
    </header>
  )
}
