import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  ApprovalSteps,
  PortalError,
  StatusPill,
  PortalPageHeading,
  formatMarketDate,
  formatMoney,
  useLocalVendorId,
} from '../components/MarketPortal'
import { cancelLocalBooking, getVendorSnapshot } from '../server/market-vendor.functions'
import type { VendorSnapshot } from '../server/market-vendor.functions'

export const Route = createFileRoute('/farmers-market_/vendor/')({
  head: () => ({ meta: [{ title: 'Vendor Dashboard | Key Biscayne Farmers Market' }] }),
  component: VendorDashboard,
})

function VendorDashboard() {
  const { vendorId, ready, forgetVendorId } = useLocalVendorId()
  const [snapshot, setSnapshot] = useState<VendorSnapshot | null>(null)
  const [error, setError] = useState('')
  const [busyBookingId, setBusyBookingId] = useState('')

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

  const latestBooking = activeBookings[0]
  async function cancelBooking() {
    if (!vendorId || !latestBooking || !window.confirm('Cancel this stall booking?')) return
    setBusyBookingId(latestBooking.id)
    setError('')
    try {
      await cancelLocalBooking({ data: { vendorId, bookingId: latestBooking.id } })
      window.location.reload()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The booking could not be cancelled.')
      setBusyBookingId('')
    }
  }


  return (
    <section className="vendor-dashboard">
      <PortalPageHeading
        eyebrow="Stall dashboard"
        title="Welcome back"
        action={
          <button
            className="text-link portal-logout"
            type="button"
            onClick={() => {
              forgetVendorId()
              window.location.href = '/farmers-market'
            }}
          >
            ← Log out
          </button>
        }
      />
      {error ? <PortalError message={error} /> : null}

      {!snapshot.vendor ? (
        <section className="application-status-card">
          <p className="portal-label">Application dashboard</p>
          <div className="application-status-card__status"><StatusPill status="not-applied" /></div>
          <p>Create a local vendor account to start an application.</p>
          <a className="button button--market-dark" href="/farmers-market/vendor/sign-up">Create an account →</a>
        </section>
      ) : !application ? (
        <section className="application-status-card">
          <p className="portal-label">Application dashboard</p>
          <div className="application-status-card__status"><StatusPill status="not-applied" /></div>
          <p>You haven’t submitted a vendor application yet. Tell us about your business and upload your health department certification to get started.</p>
          <a className="button button--market-dark" href="/farmers-market/vendor/application">Start Application →</a>
        </section>
      ) : (
        <section className="application-status-card">
          <p className="portal-label">Application dashboard</p>
          <div className="application-status-card__status">
            <StatusPill status={application.status} />
            <a href="/farmers-market/vendor/application">View Application</a>
          </div>
          {application.status === 'pending' ? (
            <p>Thanks for applying! Our market team is reviewing your health certification and details. You’ll hear back within 2–3 business days.</p>
          ) : application.status === 'rejected' ? (
            <>
              <p>Your application needs changes before approval. {application.rejectionReason}</p>
              <a className="button button--market-dark" href="/farmers-market/vendor/application">Update Application →</a>
            </>
          ) : (
            <>
              <p>You’re approved to sell at the market. Head to the plaza map to pick your stall.</p>
              <a className="button button--market-dark" href="/farmers-market/vendor/stalls">Book a stall →</a>
            </>
          )}
        </section>
      )}

      {latestBooking ? (
        <section className={`booking-summary-card${latestBooking.paymentStatus === 'complete' ? ' is-paid' : ''}`}>
          <div className="booking-summary-card__heading">
            <div>
              <p className="portal-label">Your booked stall</p>
              <h2>Stall {latestBooking.stallCode} - {latestBooking.tier} stall</h2>
            </div>
            <StatusPill status={latestBooking.paymentStatus === 'complete' ? 'complete' : 'pending-payment'} />
          </div>
          <dl className="portal-details">
            <div>
              <dt>Amount due</dt>
              <dd>{latestBooking.paymentStatus === 'complete' ? 'Payment Complete' : formatMoney(latestBooking.priceCents)}</dd>
            </div>
            <div><dt>Market date</dt><dd>{formatMarketDate(latestBooking.marketDate)}</dd></div>
          </dl>
          <div className="button-row">
            {latestBooking.paymentStatus === 'pending' ? (
              <a className="button button--market-dark" href={`/farmers-market/vendor/checkout?booking=${latestBooking.id}`}>Pay Now</a>
            ) : null}
            <a className="button portal-button--secondary" href={`/farmers-market/vendor/stalls?change=${latestBooking.id}`}>Change Stall</a>
            <button className="button portal-button--danger" type="button" onClick={cancelBooking} disabled={busyBookingId === latestBooking.id}>
              {busyBookingId === latestBooking.id ? 'Cancelling…' : 'Cancel Booking'}
            </button>
          </div>
        </section>
      ) : null}

      <ApprovalSteps />
      <a className="portal-back-link" href="/farmers-market">← Back to Market Information</a>
    </section>
  )
}
