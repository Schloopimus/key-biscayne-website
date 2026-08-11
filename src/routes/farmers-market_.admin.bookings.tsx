import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { PortalEmptyState, PortalPageHeading, StatusPill, formatMarketDate, formatMoney } from '../components/MarketPortal'
import { listAdminBookings } from '../server/market-admin.functions'

export const Route = createFileRoute('/farmers-market_/admin/bookings')({
  head: () => ({ meta: [{ title: 'Stall Bookings | Market Admin' }] }),
  loader: () => listAdminBookings(),
  component: AdminBookingsPage,
})

function AdminBookingsPage() {
  const bookings = Route.useLoaderData()
  const [filter, setFilter] = useState<'all' | 'reserved' | 'cancelled'>('all')
  const visibleBookings = bookings.filter((booking) => filter === 'all' || booking.status === filter)

  return (
    <>
      <PortalPageHeading
        eyebrow="Market admin"
        title="Stall bookings"
        body="Local reservation records and server-owned price snapshots. No payment state exists in this demo."
      />
      <div className="portal-toolbar">
        <label><span>Booking status</span><select value={filter} onChange={(event) => setFilter(event.currentTarget.value as typeof filter)}><option value="all">All bookings</option><option value="reserved">Reserved</option><option value="cancelled">Cancelled</option></select></label>
        <span>{visibleBookings.length} shown</span>
      </div>
      {visibleBookings.length === 0 ? (
        <PortalEmptyState title="No matching bookings" body="Approved vendors can create a local reservation from the stall list." />
      ) : (
        <section className="portal-table-card" aria-label="Stall bookings">
          <div className="portal-table portal-table--bookings" role="table">
            <div className="portal-table__header" role="row">
              <span role="columnheader">Vendor</span><span role="columnheader">Market date</span><span role="columnheader">Stall</span><span role="columnheader">Price</span><span role="columnheader">Status</span><span role="columnheader">Updated</span>
            </div>
            {visibleBookings.map((booking) => (
              <div className="portal-table__row" role="row" key={booking.id}>
                <span role="cell" data-label="Vendor"><strong>{booking.businessName}</strong><small>{booking.email}</small></span>
                <span role="cell" data-label="Market date">{formatMarketDate(booking.marketDate)}<small>{booking.marketLabel}</small></span>
                <span role="cell" data-label="Stall">{booking.stallCode}<small>{booking.tier}</small></span>
                <span role="cell" data-label="Price">{formatMoney(booking.priceCents)}</span>
                <span role="cell" data-label="Status"><StatusPill status={booking.status} /></span>
                <span role="cell" data-label="Updated">{new Date(booking.updatedAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
