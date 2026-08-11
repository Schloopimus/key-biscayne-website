import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import {
  PortalEmptyState,
  PortalError,
  PortalPageHeading,
  StatusPill,
  formatMarketDate,
  formatMoney,
  useLocalVendorId,
} from '../components/MarketPortal'
import { cancelLocalBooking, getVendorSnapshot } from '../server/market-vendor.functions'
import type { VendorSnapshot } from '../server/market-vendor.functions'

export const Route = createFileRoute('/farmers-market_/vendor/bookings')({
  head: () => ({ meta: [{ title: 'Vendor Bookings | Key Biscayne Farmers Market' }] }),
  component: VendorBookingsPage,
})

function VendorBookingsPage() {
  const { vendorId, ready } = useLocalVendorId()
  const [snapshot, setSnapshot] = useState<VendorSnapshot | null>(null)
  const [busyBookingId, setBusyBookingId] = useState('')
  const [error, setError] = useState('')

  const loadBookings = useCallback(async () => {
    if (!ready) return
    try {
      setSnapshot(await getVendorSnapshot({ data: { vendorId } }))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Bookings could not be loaded.')
    }
  }, [ready, vendorId])

  useEffect(() => {
    void loadBookings()
  }, [loadBookings])

  async function cancelBooking(bookingId: string) {
    if (!vendorId || !window.confirm('Cancel this local reservation? No payment or refund is involved.')) return
    setBusyBookingId(bookingId)
    setError('')
    try {
      await cancelLocalBooking({ data: { vendorId, bookingId } })
      await loadBookings()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The booking could not be cancelled.')
    } finally {
      setBusyBookingId('')
    }
  }

  if (!ready || !snapshot) return <p className="portal-loading">Loading bookings…</p>

  return (
    <>
      <PortalPageHeading
        eyebrow="Stall dashboard"
        title="Your bookings"
        body="Manage local single-date reservations. Payment, refunds, and email notices are deliberately not connected."
      />
      {error ? <PortalError message={error} /> : null}
      {!snapshot.vendor || snapshot.bookings.length === 0 ? (
        <PortalEmptyState
          title="No stall bookings"
          body="Approved vendors can choose an open Saturday and reserve a stall from the accessible inventory."
          action={<a className="button button--market-dark" href="/farmers-market/vendor/stalls">Book a stall →</a>}
        />
      ) : (
        <div className="portal-stack">
          {snapshot.bookings.map((booking) => (
            <article key={booking.id} className="portal-card booking-card">
              <div className="portal-card__heading">
                <div>
                  <p className="eyebrow">{formatMarketDate(booking.marketDate)}</p>
                  <h2>Stall {booking.stallCode}</h2>
                </div>
                <StatusPill status={booking.status} />
              </div>
              <dl className="portal-details">
                <div><dt>Market</dt><dd>{booking.label}</dd></div>
                <div><dt>Hours</dt><dd>{booking.startTime}–{booking.endTime}</dd></div>
                <div><dt>Tier</dt><dd>{booking.tier}</dd></div>
                <div><dt>Local price</dt><dd>{formatMoney(booking.priceCents)}</dd></div>
              </dl>
              <p className="portal-callout">
                {booking.status === 'reserved'
                  ? 'Reserved locally. There is no payment state or checkout for this demo.'
                  : `Cancelled ${new Date(booking.updatedAt).toLocaleString()}. No refund was required.`}
              </p>
              {booking.status === 'reserved' ? (
                <div className="button-row">
                  <a className="button portal-button--secondary" href={`/farmers-market/vendor/stalls?change=${booking.id}`}>
                    Change stall
                  </a>
                  <button
                    className="button portal-button--danger"
                    type="button"
                    onClick={() => cancelBooking(booking.id)}
                    disabled={busyBookingId === booking.id}
                  >
                    {busyBookingId === booking.id ? 'Cancelling…' : 'Cancel booking'}
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </>
  )
}
