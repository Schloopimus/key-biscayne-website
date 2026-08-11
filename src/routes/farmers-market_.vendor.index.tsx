import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  PortalEmptyState,
  PortalError,
  PortalPageHeading,
  StatusPill,
  formatMarketDate,
  formatMoney,
  useLocalVendorId,
} from '../components/MarketPortal'
import { getVendorSnapshot } from '../server/market-vendor.functions'
import type { VendorSnapshot } from '../server/market-vendor.functions'

export const Route = createFileRoute('/farmers-market_/vendor/')({
  head: () => ({ meta: [{ title: 'Vendor Dashboard | Key Biscayne Farmers Market' }] }),
  component: VendorDashboard,
})

function VendorDashboard() {
  const { vendorId, ready, forgetVendorId } = useLocalVendorId()
  const [snapshot, setSnapshot] = useState<VendorSnapshot | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!ready) return
    let active = true
    getVendorSnapshot({ data: { vendorId } })
      .then((result) => {
        if (!active) return
        setSnapshot(result)
        if (vendorId && !result.vendor) forgetVendorId()
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : 'The dashboard could not be loaded.')
      })
    return () => {
      active = false
    }
  }, [forgetVendorId, ready, vendorId])

  if (!ready || !snapshot) {
    return <p className="portal-loading">Loading local vendor dashboard…</p>
  }

  const application = snapshot.application
  const activeBookings = snapshot.bookings.filter((booking) => booking.status === 'reserved')

  return (
    <>
      <PortalPageHeading
        eyebrow="Vendor dashboard"
        title={application?.businessName ?? 'Start your market application'}
        body="Apply, follow the local review state, and reserve a market stall from one place."
      />
      {error ? <PortalError message={error} /> : null}

      {!snapshot.vendor || !application ? (
        <PortalEmptyState
          title="No vendor application"
          body="Create a local vendor profile and submit the business details the market team needs to review."
          action={
            <a className="button button--market-dark" href="/farmers-market/vendor/application">
              Start application <span aria-hidden="true">→</span>
            </a>
          }
        />
      ) : (
        <div className="portal-stack">
          <section className="portal-card application-summary">
            <div className="portal-card__heading">
              <div>
                <p className="eyebrow">Application dashboard</p>
                <h2>Vendor application</h2>
              </div>
              <StatusPill status={application.status} />
            </div>
            <dl className="portal-details">
              <div><dt>Business</dt><dd>{application.businessName}</dd></div>
              <div><dt>Category</dt><dd>{application.productCategory}</dd></div>
              <div><dt>Revision</dt><dd>{application.revision}</dd></div>
              <div><dt>Submitted</dt><dd>{new Date(application.submittedAt).toLocaleString()}</dd></div>
            </dl>
            {application.status === 'pending' ? (
              <p className="portal-callout">Your application is waiting for local admin review.</p>
            ) : null}
            {application.status === 'rejected' ? (
              <div className="portal-callout portal-callout--danger">
                <strong>Reason from the market team</strong>
                <p>{application.rejectionReason}</p>
                <a className="button button--market-dark" href="/farmers-market/vendor/application">Reapply →</a>
              </div>
            ) : null}
            {application.status === 'approved' ? (
              <div className="button-row">
                <a className="button button--market-dark" href="/farmers-market/vendor/stalls">Book a stall →</a>
                <a className="button portal-button--secondary" href={`/api/local-demo/certificates/${application.id}`}>
                  Download certificate
                </a>
              </div>
            ) : null}
          </section>

          <section className="portal-card">
            <div className="portal-card__heading">
              <div>
                <p className="eyebrow">Stall dashboard</p>
                <h2>Active reservations</h2>
              </div>
              <strong className="portal-count">{activeBookings.length}</strong>
            </div>
            {activeBookings.length === 0 ? (
              <p>No active stall reservations yet.</p>
            ) : (
              <div className="portal-list">
                {activeBookings.map((booking) => (
                  <article key={booking.id} className="portal-list-row">
                    <div>
                      <strong>Stall {booking.stallCode}</strong>
                      <span>{formatMarketDate(booking.marketDate)} · {booking.startTime}–{booking.endTime}</span>
                    </div>
                    <div className="portal-list-row__meta">
                      <span>{formatMoney(booking.priceCents)}</span>
                      <StatusPill status="reserved" />
                    </div>
                  </article>
                ))}
              </div>
            )}
            <a className="arrow-link" href="/farmers-market/vendor/bookings"><span>Manage bookings</span><span>→</span></a>
          </section>

          <button className="text-link portal-forget" type="button" onClick={forgetVendorId}>
            Forget this local vendor on this browser
          </button>
        </div>
      )}
    </>
  )
}
