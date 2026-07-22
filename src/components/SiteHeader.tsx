import { useState } from 'react'
import { navItems } from '../site-data'

type SiteHeaderProps = {
  active?: string
  inverse?: boolean
}

export function SiteHeader({ active, inverse = false }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className={`site-header${inverse ? ' site-header--inverse' : ''}`}>
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
