import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { SiteHeader } from './SiteHeader'

const localVendorStorageKey = 'kbcc-market-local-vendor-id'

type MarketPortalLayoutProps = {
  area: 'vendor' | 'admin'
  active: string
  children: ReactNode
}

function portalView(area: MarketPortalLayoutProps['area'], pathname: string) {
  if (pathname.endsWith('/market-dates/new')) return 'form'
  if (area === 'admin') {
    return 'admin'
  }
  if (pathname.endsWith('/sign-up') || pathname.endsWith('/login') || pathname.includes('/checkout')) {
    return 'centered'
  }
  if (pathname.endsWith('/application')) return 'form'
  if (pathname.endsWith('/stalls')) return 'map'
  return 'vendor'
}

export function MarketPortalLayout({ area, active, children }: MarketPortalLayoutProps) {
  return (
    <div className={`market-portal market-portal--${area}`}>
      <SiteHeader active="/farmers-market" surface="portal" />
      <main id="main-content" className={`portal-main portal-main--${portalView(area, active)}`}>
        {children}
      </main>
    </div>
  )
}

export function PortalPageHeading({
  eyebrow,
  title,
  body,
  action,
}: {
  eyebrow: string
  title: string
  body?: string
  action?: ReactNode
}) {
  return (
    <header className="portal-page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {body ? <p className="portal-page-heading__body">{body}</p> : null}
      </div>
      {action}
    </header>
  )
}

const statusLabels: Record<string, string> = {
  approved: 'Approved',
  booked: 'Booked',
  cancelled: 'Cancelled',
  closed: 'Closed',
  complete: 'Payment complete',
  confirmed: 'Confirmed',
  current: 'Current',
  new: 'New',
  'not-applied': 'Not applied',
  pending: 'Pending review',
  'pending-payment': 'Pending payment',
  rejected: 'Not approved',
  reserved: 'Reserved',
}

export function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase()
  return (
    <span className="status-pill" data-status={normalized}>
      {statusLabels[normalized] ?? status.replaceAll('-', ' ')}
    </span>
  )
}

export function ApprovalSteps() {
  return (
    <section className="approval-steps">
      <p className="portal-label">How approval works</p>
      <ol>
        <li>
          <h2>1. Apply</h2>
          <p>Submit business details and your health department certification.</p>
        </li>
        <li>
          <h2>2. Review</h2>
          <p>Our team verifies your documents within 2–3 business days.</p>
        </li>
        <li>
          <h2>3. Book</h2>
          <p>Once approved, reserve your stall on the plaza map any week.</p>
        </li>
      </ol>
    </section>
  )
}

type AdminCounts = {
  pendingApplications: number
  approvedVendors: number
  activeBookings: number
}

export function AdminSummaryTabs({
  counts,
  active,
}: {
  counts: AdminCounts
  active: 'applications' | 'vendors' | 'bookings'
}) {
  const tabs = [
    {
      key: 'applications',
      href: '/farmers-market/admin',
      label: 'Vendor applications',
      value: counts.pendingApplications,
      note: 'pending review',
    },
    {
      key: 'vendors',
      href: '/farmers-market/admin/vendors',
      label: 'All vendors',
      value: counts.approvedVendors,
      note: 'approved vendors',
    },
    {
      key: 'bookings',
      href: '/farmers-market/admin/market-dates',
      label: 'Stall bookings',
      value: counts.activeBookings,
      note: 'active bookings',
    },
  ] as const

  return (
    <nav className="admin-summary-tabs" aria-label="Market administration">
      {tabs.map((tab) => (
        <a key={tab.key} className={active === tab.key ? 'is-active' : undefined} href={tab.href}>
          <span>{tab.label}</span>
          <strong>{tab.value}</strong>
          <small>{tab.note}</small>
        </a>
      ))}
    </nav>
  )
}

export function LocalDemoNote({ children }: { children?: ReactNode }) {
  return (
    <p className="local-demo-note" role="note">
      <strong>Local demo:</strong>{' '}
      {children ?? 'Authentication, email, and payments are not connected. Data stays on this machine.'}
    </p>
  )
}

export function PortalEmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <section className="portal-empty-state">
      <p className="portal-label">Nothing here yet</p>
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

export function formatMarketDate(value: string, includeYear = true) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: includeYear ? 'numeric' : undefined,
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
