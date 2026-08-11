import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { AdminSummaryTabs, PortalEmptyState, PortalPageHeading, StatusPill, formatMarketDate } from '../components/MarketPortal'
import { getAdminDashboard, listAdminBookings } from '../server/market-admin.functions'

export const Route = createFileRoute('/farmers-market_/admin/bookings')({
  head: () => ({ meta: [{ title: 'Stall Bookings | Market Admin' }] }),
  loader: async () => {
    const [bookings, dashboard] = await Promise.all([listAdminBookings(), getAdminDashboard()])
    return { bookings, dashboard }
  },
  component: AdminBookingsPage,
})

function AdminBookingsPage() {
  const { bookings, dashboard } = Route.useLoaderData()
  const [query, setQuery] = useState('')
  const [eventId, setEventId] = useState('')

  useEffect(() => {
    setEventId(new URLSearchParams(window.location.search).get('event') ?? '')
  }, [])

  const visibleBookings = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return bookings.filter((booking) => {
      if (booking.status !== 'reserved') return false
      if (eventId && booking.eventId !== eventId) return false
      if (!normalized) return true
      return [booking.businessName, booking.contactName, booking.email, booking.phone, booking.stallCode]
        .some((value) => value.toLowerCase().includes(normalized))
    })
  }, [bookings, eventId, query])
  const selectedDate = eventId ? bookings.find((booking) => booking.eventId === eventId)?.marketDate : null

  return (
    <section className="admin-bookings-screen">
      <PortalPageHeading
        eyebrow="Market admin"
        title="Dashboard"
        action={<a className="portal-back-link" href="/farmers-market">← Log out</a>}
      />
      <AdminSummaryTabs counts={dashboard.counts} active="bookings" />
      <div className="admin-table-toolbar">
        <div>
          {eventId ? <a className="portal-back-link" href="/farmers-market/admin/market-dates">← Back</a> : null}
          <h2>{selectedDate ? formatMarketDate(selectedDate) : 'All active bookings'}</h2>
        </div>
        <label className="admin-search">
          <span className="sr-only">Search bookings</span>
          <input value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Search by business, contact …" />
        </label>
      </div>
      {visibleBookings.length === 0 ? (
        <PortalEmptyState title="No matching bookings" body="Confirmed vendor reservations will appear here." />
      ) : (
        <section className="portal-table-card" aria-label="Stall bookings">
          <div className="portal-table portal-table--bookings" role="table">
            <div className="portal-table__header" role="row">
              <span role="columnheader">Stall</span>
              <span role="columnheader">Tier</span>
              <span role="columnheader">Vendor</span>
              <span role="columnheader">Phone</span>
              <span role="columnheader">Payment status</span>
            </div>
            {visibleBookings.map((booking) => (
              <div className="portal-table__row" role="row" key={booking.id}>
                <span role="cell" data-label="Stall"><strong>{booking.stallCode}</strong></span>
                <span role="cell" data-label="Tier">{booking.tier}</span>
                <span role="cell" data-label="Vendor">{booking.businessName}</span>
                <span role="cell" data-label="Phone">{booking.phone}</span>
                <span role="cell" data-label="Payment status">
                  <StatusPill status={booking.paymentStatus === 'complete' ? 'confirmed' : 'pending-payment'} />
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
      <p className="admin-pagination">Page 1/1</p>
    </section>
  )
}
