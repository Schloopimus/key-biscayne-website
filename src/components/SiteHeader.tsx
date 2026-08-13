import { useEffect, useState } from 'react'
import { navItems } from '../site-data'

type HeaderSurface =
  | 'image'
  | 'cream'
  | 'mist'
  | 'school'
  | 'navy'
  | 'warm'
  | 'brown'
  | 'green'
  | 'green-pale'
  | 'portal'

type SiteHeaderProps = {
  active?: string
  surface?: HeaderSurface
}

const inverseSurfaces: Partial<Record<HeaderSurface, true>> = {
  image: true,
  navy: true,
  brown: true,
  green: true,
}

export function SiteHeader({ active, surface = 'cream' }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [currentSurface, setCurrentSurface] = useState<HeaderSurface>(surface)

  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.snap-page')
    const sections = Array.from(root?.querySelectorAll<HTMLElement>(':scope > .page-section') ?? [])
    if (!root || sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        const nextSurface = visible?.target.getAttribute('data-header-surface') as
          | HeaderSurface
          | null
        if (nextSurface) setCurrentSurface(nextSurface)
      },
      { root, threshold: [0.35, 0.55, 0.75] },
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  const inverse = Boolean(inverseSurfaces[currentSurface])

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header
        className={`site-header${inverse ? ' site-header--inverse' : ''}`}
        data-surface={currentSurface}
      >
        <a className="brand" href="/" aria-label="Key Biscayne Community Church home">
          <img
            className="brand__mark"
            src="/images/church-logo-228669.png"
            alt=""
            width="42"
            height="42"
          />
          <span className="brand__copy">
            <strong>Key Biscayne</strong>
            <small>Community Church & Day School</small>
          </span>
        </a>

        <button
          className="menu-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="site-navigation"
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
        </button>

        <nav
          id="site-navigation"
          className={`site-nav${menuOpen ? ' site-nav--open' : ''}`}
          aria-label="Primary navigation"
        >
          {navItems.map((item) => (
            <a
              key={item.label}
              className={active === item.href ? 'is-active' : undefined}
              href={item.href}
              aria-current={active === item.href ? 'page' : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <a className="site-nav__donate" href="/about#contact" onClick={() => setMenuOpen(false)}>
            Donate
          </a>
        </nav>
      </header>
    </>
  )
}
