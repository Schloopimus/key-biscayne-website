import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState, type FormEvent } from 'react'
import { PortalEmptyState, PortalError, PortalPageHeading, StatusPill, formatMarketDate } from '../components/MarketPortal'
import {
  createMarketEvent,
  getMarketAdministration,
  setMarketEventStatus,
  updateEventStall,
} from '../server/market-admin.functions'

export const Route = createFileRoute('/farmers-market_/admin/market-dates')({
  head: () => ({ meta: [{ title: 'Market Dates | Market Admin' }] }),
  loader: () => getMarketAdministration(),
  component: MarketDatesPage,
})

function MarketDatesPage() {
  const router = useRouter()
  const events = Route.useLoaderData()
  const [selectedEventId, setSelectedEventId] = useState('')
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!selectedEventId && events[0]) setSelectedEventId(events[0].id)
  }, [events, selectedEventId])

  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null

  async function createDate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    setBusyId('create')
    setError('')
    try {
      const result = await createMarketEvent({
        data: {
          marketDate: String(formData.get('marketDate') ?? ''),
          label: String(formData.get('label') ?? ''),
          startTime: String(formData.get('startTime') ?? ''),
          endTime: String(formData.get('endTime') ?? ''),
        },
      })
      form.reset()
      setSelectedEventId(result.eventId)
      await router.invalidate()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The market date could not be created.')
    } finally {
      setBusyId('')
    }
  }

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
    <>
      <PortalPageHeading
        eyebrow="Market admin"
        title="Dates and stalls"
        body="Open Saturday inventory and manage the list vendors can reserve. The final three-dimensional plaza diagram is a placeholder."
      />
      {error ? <PortalError message={error} /> : null}

      <section className="portal-card">
        <div className="portal-card__heading">
          <div><p className="eyebrow">New market date</p><h2>Open booking inventory</h2></div>
        </div>
        <form className="portal-form portal-form--inline" onSubmit={createDate}>
          <label><span>Date *</span><input name="marketDate" type="date" required /></label>
          <label><span>Label *</span><input name="label" defaultValue="Saturday Farmers Market" required /></label>
          <label><span>Start *</span><input name="startTime" type="time" defaultValue="09:00" required /></label>
          <label><span>End *</span><input name="endTime" type="time" defaultValue="12:00" required /></label>
          <button className="button button--market-dark" type="submit" disabled={busyId === 'create'}>
            {busyId === 'create' ? 'Creating…' : 'Create date →'}
          </button>
        </form>
        <p className="portal-form-note">Each new date starts with the twelve local placeholder stalls at the visible Figma price of $75.</p>
      </section>

      {events.length === 0 ? (
        <PortalEmptyState title="No market dates" body="Create the first Saturday above." />
      ) : (
        <div className="market-admin-layout">
          <aside className="portal-card market-date-list">
            <p className="eyebrow">Dates open for booking</p>
            {events.map((event) => (
              <button
                key={event.id}
                className={selectedEventId === event.id ? 'is-active' : undefined}
                type="button"
                onClick={() => setSelectedEventId(event.id)}
              >
                <span><strong>{formatMarketDate(event.marketDate)}</strong><small>{event.startTime}–{event.endTime}</small></span>
                <StatusPill status={event.status} />
              </button>
            ))}
          </aside>

          {selectedEvent ? (
            <section className="portal-card inventory-admin">
              <div className="portal-card__heading">
                <div><p className="eyebrow">Selected date</p><h2>{formatMarketDate(selectedEvent.marketDate)}</h2></div>
                <button className="button portal-button--secondary" type="button" onClick={toggleDate} disabled={busyId === selectedEvent.id}>
                  {selectedEvent.status === 'open' ? 'Close booking' : 'Reopen booking'}
                </button>
              </div>
              <div className="diagram-placeholder diagram-placeholder--wide" role="img" aria-label="Placeholder for future three-dimensional stall editor">
                <span>Plaza inventory diagram</span><strong>Placeholder</strong><p>Edit the same inventory through the accessible list below.</p>
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
        </div>
      )}
    </>
  )
}
