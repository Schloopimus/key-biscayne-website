import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import {
  PortalEmptyState,
  PortalError,
  PortalPageHeading,
  formatMarketDate,
  formatMoney,
  useLocalVendorId,
} from '../components/MarketPortal'
import {
  changeLocalBooking,
  createLocalBooking,
  getAvailableStalls,
  getVendorSnapshot,
} from '../server/market-vendor.functions'
import type { AvailableMarketEvent, VendorSnapshot } from '../server/market-vendor.functions'

export const Route = createFileRoute('/farmers-market_/vendor/stalls')({
  head: () => ({ meta: [{ title: 'Book a Stall | Key Biscayne Farmers Market' }] }),
  component: StallSelectionPage,
})

function StallSelectionPage() {
  const { vendorId, ready } = useLocalVendorId()
  const [snapshot, setSnapshot] = useState<VendorSnapshot | null>(null)
  const [events, setEvents] = useState<Array<AvailableMarketEvent>>([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [selectedStallId, setSelectedStallId] = useState('')
  const [changeBookingId, setChangeBookingId] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving'>('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!ready) return
    if (!vendorId) {
      setSnapshot({ vendor: null, application: null, bookings: [] })
      return
    }

    Promise.all([getVendorSnapshot({ data: { vendorId } }), getAvailableStalls({ data: { vendorId } })])
      .then(([nextSnapshot, nextEvents]) => {
        setSnapshot(nextSnapshot)
        setEvents(nextEvents)
        const requestedBookingId = new URLSearchParams(window.location.search).get('change')
        const requestedBooking = nextSnapshot.bookings.find(
          (booking) => booking.id === requestedBookingId && booking.status === 'reserved',
        )
        setChangeBookingId(requestedBooking?.id ?? null)
        setSelectedEventId(requestedBooking?.eventId ?? nextEvents[0]?.id ?? '')
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Stall inventory could not be loaded.'))
  }, [ready, vendorId])

  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null
  const selectedStall = selectedEvent?.stalls.find((stall) => stall.eventStallId === selectedStallId) ?? null
  const changingBooking = useMemo(
    () => snapshot?.bookings.find((booking) => booking.id === changeBookingId) ?? null,
    [changeBookingId, snapshot],
  )

  async function reserve() {
    if (!vendorId || !selectedStall) return
    setStatus('saving')
    setError('')

    try {
      if (changingBooking) {
        await changeLocalBooking({
          data: { vendorId, bookingId: changingBooking.id, eventStallId: selectedStall.eventStallId },
        })
        window.location.href = '/farmers-market/vendor/bookings'
      } else {
        const booking = await createLocalBooking({ data: { vendorId, eventStallId: selectedStall.eventStallId } })
        window.location.href = `/farmers-market/vendor/checkout?booking=${booking.bookingId}`
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The local reservation could not be saved.')
      setStatus('idle')
    }
  }

  if (!ready || !snapshot) return <p className="portal-loading">Loading stall inventory…</p>
  if (!snapshot.vendor) {
    return (
      <PortalEmptyState
        title="Start a vendor application first"
        body="The local demo needs a vendor profile before it can show approved stall inventory."
        action={<a className="button button--market-dark" href="/farmers-market/vendor/application">Start application →</a>}
      />
    )
  }

  return (
    <section className="stall-map-screen">
      <PortalPageHeading
        eyebrow={changingBooking ? 'Change your spot' : 'Pick your spot'}
        title={changingBooking ? `Move stall ${changingBooking.stallCode}` : 'Plaza Map'}
      />
      {error ? <PortalError message={error} /> : null}

      {events.length === 0 ? (
        <PortalEmptyState
          title="No open market dates"
          body="A local admin can open dates and configure stall availability from the Market dates screen."
          action={<a className="button portal-button--secondary" href="/farmers-market/admin/market-dates">Open admin demo →</a>}
        />
      ) : (
        <>
          <div className="map-toolbar">
            <div className="map-toolbar__dates">
              <p className="portal-label">Choose a market date</p>
              <div className="choice-pills">
                {events.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    className={selectedEventId === event.id ? 'is-active' : ''}
                    disabled={Boolean(changingBooking)}
                    onClick={() => {
                      setSelectedEventId(event.id)
                      setSelectedStallId('')
                    }}
                  >
                    {formatMarketDate(event.marketDate, false)}
                  </button>
                ))}
              </div>
            </div>
            <div className="map-toolbar__booking">
              <div className="stall-legend" aria-label="Stall legend">
                <span><i className="is-standard" />Standard</span>
                <span><i className="is-corner" />Corner</span>
                <span><i className="is-premium" />Premium</span>
                <span><i className="is-booked" />Booked</span>
              </div>
              <p className="portal-label">Booking length</p>
              <div className="choice-pills choice-pills--length">
                <button type="button" className="is-active">Single Date</button>
                <button type="button" disabled>Month</button>
                <button type="button" disabled>Quarter</button>
                <button type="button" disabled>Year</button>
              </div>
            </div>
          </div>

          <div className="plaza-layout">
            <div className="plaza-map" aria-label="Accessible two-dimensional plaza stall map">
              <span className="plaza-map__parking">Parking Area</span>
              {selectedEvent?.stalls.map((stall) => {
                const isCurrent = changingBooking?.eventStallId === stall.eventStallId
                const isBooked = Boolean(stall.bookingId) && !isCurrent
                return (
                  <button
                    key={stall.eventStallId}
                    className={`plaza-stall plaza-stall--${stall.tier}${isBooked ? ' is-booked' : ''}`}
                    type="button"
                    disabled={isBooked}
                    aria-pressed={selectedStallId === stall.eventStallId}
                    aria-label={`Stall ${stall.stallCode}, ${stall.tier}, ${formatMoney(stall.priceCents)}, ${isCurrent ? 'your current stall' : isBooked ? 'booked' : 'available'}`}
                    onClick={() => setSelectedStallId(stall.eventStallId)}
                  >
                    <strong>{stall.stallCode}</strong>
                    <span>{isBooked ? 'Booked' : formatMoney(stall.priceCents)}</span>
                  </button>
                )
              })}
            </div>

            <aside className="stall-detail-panel">
              {selectedStall ? (
                <>
                  <div>
                    <p className="portal-label">Stall {selectedStall.stallCode}</p>
                    <h2>{selectedStall.tier} stall</h2>
                    <p>{selectedStall.description}</p>
                  </div>
                  <dl>
                    <div><dt>Market date</dt><dd>{selectedEvent ? formatMarketDate(selectedEvent.marketDate) : '—'}</dd></div>
                    <div><dt>Stall price</dt><dd>{formatMoney(selectedStall.priceCents)}</dd></div>
                  </dl>
                  <button className="button button--market-dark" type="button" onClick={reserve} disabled={status === 'saving'}>
                    {status === 'saving' ? 'Reserving…' : changingBooking ? 'Change stall →' : 'Reserve stall →'}
                  </button>
                </>
              ) : (
                <p className="stall-detail-panel__prompt">Tap an open stall on the map to see details and reserve it.</p>
              )}
              <a className="portal-back-link" href="/farmers-market/vendor">← Back to dashboard</a>
            </aside>
          </div>
        </>
      )}
    </section>
  )
}
