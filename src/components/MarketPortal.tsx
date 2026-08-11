import { useCallback, useEffect, useState, type ReactNode } from 'react'

const vendorNavigation = [
  { href: '/farmers-market/vendor', label: 'Dashboard' },
  { href: '/farmers-market/vendor/application', label: 'Application' },
  { href: '/farmers-market/vendor/stalls', label: 'Book a stall' },
  { href: '/farmers-market/vendor/bookings', label: 'Bookings' },
] as const

const adminNavigation = [
  { href: '/farmers-market/admin', label: 'Dashboard' },
  { href: '/farmers-market/admin/applications', label: 'Applications' },
  { href: '/farmers-market/admin/submissions', label: 'Public inbox' },
  { href: '/farmers-market/admin/vendors', label: 'Vendors' },
  { href: '/farmers-market/admin/market-dates', label: 'Market dates' },
  { href: '/farmers-market/admin/bookings', label: 'Bookings' },
] as const

const localVendorStorageKey = 'kbcc-market-local-vendor-id'

type MarketPortalLayoutProps = {
  area: 'vendor' | 'admin'
  active: string
  children: ReactNode
}

export function MarketPortalLayout({ area, active, children }: MarketPortalLayoutProps) {
  const navigation = area === 'vendor' ? vendorNavigation : adminNavigation

  return (
    <div className={`market-portal market-portal--${area}`}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="portal-header">
        <a className="portal-brand" href="/farmers-market" aria-label="Farmers Market public page">
          <img src="/images/church-logo-228669.png" width="42" height="42" alt="" />
          <span>
            <strong>Key Biscayne</strong>
            <small>{area === 'vendor' ? 'Vendor portal' : 'Market admin'}</small>
          </span>
        </a>
        <nav className="portal-nav" aria-label={`${area === 'vendor' ? 'Vendor' : 'Market admin'} navigation`}>
          {navigation.map((item) => (
            <a key={item.href} className={active === item.href ? 'is-active' : undefined} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <a className="portal-site-link" href={area === 'vendor' ? '/farmers-market/admin' : '/farmers-market/vendor'}>
          {area === 'vendor' ? 'Admin demo' : 'Vendor demo'}
        </a>
      </header>
      <div className="demo-boundary" role="note">
        <strong>Local demo</strong>
        <span>Authentication, email, and payments are not connected. Data stays on this machine.</span>
      </div>
      <main id="main-content" className="portal-main">
        {children}
      </main>
    </div>
  )
}

export function PortalPageHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <header className="portal-page-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {body ? <p>{body}</p> : null}
    </header>
  )
}

export function StatusPill({ status }: { status: string }) {
  return (
    <span className="status-pill" data-status={status.toLowerCase()}>
      {status.replaceAll('-', ' ')}
    </span>
  )
}

export function PortalEmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <section className="portal-empty-state">
      <p className="eyebrow">Nothing here yet</p>
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </section>
  )
}

export function PortalError({ message }: { message: string }) {
  return (
    <p className="portal-error" role="alert">
      {message}
    </p>
  )
}

export function formatMarketDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`))
}

export function formatMoney(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export function useLocalVendorId() {
  const [vendorId, setVendorIdState] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setVendorIdState(window.localStorage.getItem(localVendorStorageKey))
    setReady(true)
  }, [])

  const rememberVendorId = useCallback((nextVendorId: string) => {
    window.localStorage.setItem(localVendorStorageKey, nextVendorId)
    setVendorIdState(nextVendorId)
  }, [])

  const forgetVendorId = useCallback(() => {
    window.localStorage.removeItem(localVendorStorageKey)
    setVendorIdState(null)
  }, [])

  return { vendorId, ready, rememberVendorId, forgetVendorId }
}
