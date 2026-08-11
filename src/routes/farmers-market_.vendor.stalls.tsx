import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import {
  PortalEmptyState,
  PortalError,
  PortalPageHeading,
  StatusPill,
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
      } else {
        await createLocalBooking({ data: { vendorId, eventStallId: selectedStall.eventStallId } })
      }
      window.location.href = '/farmers-market/vendor/bookings'
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
    <>
      <PortalPageHeading
        eyebrow={changingBooking ? 'Change reservation' : 'Book a stall'}
        title={changingBooking ? `Move stall ${changingBooking.stallCode}` : 'Choose a Saturday stall'}
        body="Single-date reservations are enabled for this local demo. Month, quarter, year, payment, and the final plaza model remain disconnected."
      />
      {error ? <PortalError message={error} /> : null}

      {events.length === 0 ? (
        <PortalEmptyState
          title="No open market dates"
          body="A local admin can open dates and configure stall availability from the Market dates screen."
          action={<a className="button portal-button--secondary" href="/farmers-market/admin/market-dates">Open admin demo →</a>}
        />
      ) : (
        <div className="stall-booking-layout">
          <aside className="portal-card stall-booking-controls">
            <label>
              <span>Market date</span>
              <select
                value={selectedEventId}
                onChange={(event) => {
                  setSelectedEventId(event.currentTarget.value)
                  setSelectedStallId('')
                }}
                disabled={Boolean(changingBooking)}
              >
                {events.map((event) => (
                  <option key={event.id} value={event.id}>{formatMarketDate(event.marketDate)}</option>
                ))}
              </select>
            </label>
            {selectedEvent ? (
              <dl className="portal-details portal-details--single">
                <div><dt>Hours</dt><dd>{selectedEvent.startTime}–{selectedEvent.endTime}</dd></div>
                <div><dt>Booking length</dt><dd>Single date</dd></div>
              </dl>
            ) : null}
            <div className="diagram-placeholder" role="img" aria-label="Placeholder for the future three-dimensional plaza diagram">
              <span>3D plaza diagram</span>
              <strong>Placeholder</strong>
              <p>Use the accessible stall list to make this local reservation.</p>
            </div>
            {changingBooking ? <a className="arrow-link" href="/farmers-market/vendor/bookings"><span>Cancel change</span><span>→</span></a> : null}
          </aside>

          <section className="portal-card stall-inventory" aria-labelledby="stall-list-title">
            <div className="portal-card__heading">
              <div>
                <p className="eyebrow">Accessible stall list</p>
                <h2 id="stall-list-title">Available inventory</h2>
              </div>
              <span>{selectedEvent?.stalls.filter((stall) => !stall.bookingId).length ?? 0} open</span>
            </div>
            <div className="stall-list">
              {selectedEvent?.stalls.map((stall) => {
                const isCurrent = changingBooking?.eventStallId === stall.eventStallId
                const isBooked = Boolean(stall.bookingId)
                return (
                  <button
                    key={stall.eventStallId}
                    className="stall-option"
                    type="button"
                    disabled={isBooked}
                    aria-pressed={selectedStallId === stall.eventStallId}
                    aria-label={`Stall ${stall.stallCode}, ${stall.tier}, ${formatMoney(stall.priceCents)}, ${isCurrent ? 'your current stall' : isBooked ? 'booked' : 'available'}`}
                    onClick={() => setSelectedStallId(stall.eventStallId)}
                  >
                    <strong>{stall.stallCode}</strong>
                    <span>{stall.tier}</span>
                    <span>{formatMoney(stall.priceCents)}</span>
                    {isCurrent ? <StatusPill status="current" /> : isBooked ? <StatusPill status="booked" /> : null}
                  </button>
                )
              })}
            </div>

            {selectedStall ? (
              <div className="selected-stall" role="status">
                <div>
                  <p className="eyebrow">Stall {selectedStall.stallCode}</p>
                  <h3>{selectedStall.tier} stall</h3>
                  <p>{selectedStall.description}</p>
                </div>
                <strong>{formatMoney(selectedStall.priceCents)} <small>/ Saturday</small></strong>
                <button className="button button--market-dark" type="button" onClick={reserve} disabled={status === 'saving'}>
                  {status === 'saving' ? 'Saving reservation…' : changingBooking ? 'Change to this stall →' : 'Reserve locally →'}
                </button>
              </div>
            ) : (
              <p className="portal-callout">Choose any available stall to review its details.</p>
            )}
          </section>
        </div>
      )}
    </>
  )
}
