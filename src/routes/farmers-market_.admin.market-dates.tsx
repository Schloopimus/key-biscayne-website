import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import {
  AdminSummaryTabs,
  PortalEmptyState,
  PortalError,
  PortalPageHeading,
  formatMarketDate,
} from '../components/MarketPortal'
import {
  getAdminDashboard,
  getMarketAdministration,
  setMarketEventStatus,
  updateEventStall,
} from '../server/market-admin.functions'

export const Route = createFileRoute('/farmers-market_/admin/market-dates')({
  head: () => ({ meta: [{ title: 'Market Dates | Market Admin' }] }),
  loader: async () => {
    const [events, dashboard] = await Promise.all([getMarketAdministration(), getAdminDashboard()])
    return { events, dashboard }
  },
  component: MarketDatesPage,
})

function MarketDatesPage() {
  const router = useRouter()
  const { events, dashboard } = Route.useLoaderData()
  const [selectedEventId, setSelectedEventId] = useState('')
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')


  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null



  async function toggleDate() {
    if (!selectedEvent) return
    setBusyId(selectedEvent.id)
    setError('')
    try {
      await setMarketEventStatus({
        data: { eventId: selectedEvent.id, status: selectedEvent.status === 'open' ? 'closed' : 'open' },
      })
      await router.invalidate()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The market status could not be changed.')
    } finally {
      setBusyId('')
    }
  }

  async function saveStall(event: FormEvent<HTMLFormElement>, eventStallId: string) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setBusyId(eventStallId)
    setError('')
    try {
      await updateEventStall({
        data: {
          eventStallId,
          tier: String(formData.get('tier')) as 'standard' | 'corner' | 'premium',
          priceCents: Math.round(Number(formData.get('price')) * 100),
          active: formData.get('active') === 'on',
        },
      })
      await router.invalidate()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The stall could not be updated.')
    } finally {
      setBusyId('')
    }
  }

  return (
    <section className="admin-dates-screen">
      <PortalPageHeading
        eyebrow="Market admin"
        title="Dashboard"
        action={<a className="portal-back-link" href="/farmers-market">← Log out</a>}
      />
      <AdminSummaryTabs counts={dashboard.counts} active="bookings" />
      {error ? <PortalError message={error} /> : null}

      <div className="admin-list-heading">
        <p className="portal-label">Dates open for booking</p>
        <a className="button button--market-dark" href="/farmers-market/admin/market-dates/new">New slot →</a>
      </div>

      {events.length === 0 ? (
        <PortalEmptyState
          title="No market dates"
          body="Create the first Saturday booking slot."
          action={<a className="button button--market-dark" href="/farmers-market/admin/market-dates/new">New slot →</a>}
        />
      ) : (
        <div className="market-date-rows">
          {events.map((event) => {
            const booked = event.inventory.reduce((total, stall) => total + stall.bookingCount, 0)
            const open = event.inventory.filter((stall) => stall.active && stall.bookingCount === 0).length
            return (
              <article key={event.id} className="market-date-row">
                <div>
                  <h2>{formatMarketDate(event.marketDate)}</h2>
                  <p>{open} open · {booked} booked {event.status === 'closed' ? '· closed' : ''}</p>
                </div>
                <div className="button-row">
                  <a className="button button--market-dark" href={`/farmers-market/admin/bookings?event=${event.id}`}>View Bookings</a>
                  <button className="button portal-button--secondary" type="button" onClick={() => setSelectedEventId(selectedEventId === event.id ? '' : event.id)}>
                    {selectedEventId === event.id ? 'Close Editor' : 'Edit Stalls'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {selectedEvent ? (
        <section className="stall-editor-panel">
          <div className="portal-card__heading">
            <div><p className="eyebrow">Edit stalls</p><h2>{formatMarketDate(selectedEvent.marketDate)}</h2></div>
            <button className="button portal-button--secondary" type="button" onClick={toggleDate} disabled={busyId === selectedEvent.id}>
              {selectedEvent.status === 'open' ? 'Close booking' : 'Reopen booking'}
            </button>
          </div>
          <div className="inventory-editor" aria-label="Stall inventory">
            {selectedEvent.inventory.map((stall) => (
              <form key={stall.id} className="inventory-row" onSubmit={(event) => saveStall(event, stall.id)}>
                <div><strong>Stall {stall.stallCode}</strong><small>{stall.bookingCount ? 'Reserved' : 'Available'}</small></div>
                <label><span>Tier</span><select name="tier" defaultValue={stall.tier}><option value="standard">Standard</option><option value="corner">Corner</option><option value="premium">Premium</option></select></label>
                <label><span>Price</span><input name="price" type="number" min="0" max="1000" step="0.01" defaultValue={(stall.priceCents / 100).toFixed(2)} /></label>
                <label className="inventory-active"><input name="active" type="checkbox" defaultChecked={stall.active} /><span>Active</span></label>
                <button className="button portal-button--secondary" type="submit" disabled={busyId === stall.id}>{busyId === stall.id ? 'Saving…' : 'Save'}</button>
              </form>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  )
}
