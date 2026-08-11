import { createFileRoute } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { PortalError, PortalPageHeading } from '../components/MarketPortal'
import { createMarketEvent } from '../server/market-admin.functions'

export const Route = createFileRoute('/farmers-market_/admin/market-dates_/new')({
  head: () => ({ meta: [{ title: 'New Market Date | Market Admin' }] }),
  component: NewMarketDatePage,
})

function NewMarketDatePage() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    const formData = new FormData(event.currentTarget)
    setSubmitting(true)
    setError('')
    try {
      await createMarketEvent({
        data: {
          marketDate: String(formData.get('marketDate') ?? ''),
          label: 'Saturday Farmers Market',
          startTime: String(formData.get('startTime') ?? ''),
          endTime: String(formData.get('endTime') ?? ''),
          tier: String(formData.get('tier') ?? 'standard') as 'standard' | 'corner' | 'premium',
          priceCents: Math.round(Number(formData.get('price')) * 100),
        },
      })
      window.location.href = '/farmers-market/admin/market-dates'
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The market date could not be created.')
      setSubmitting(false)
    }
  }

  return (
    <section className="new-slot-screen">
      <PortalPageHeading eyebrow="Market admin" title="Create a new market date" />
      {error ? <PortalError message={error} /> : null}
      <form className="new-slot-card portal-form" onSubmit={submit} aria-busy={submitting}>
        <div className="new-slot-card__time-row">
          <label>
            <span>Select date</span>
            <input name="marketDate" type="date" required />
          </label>
          <fieldset>
            <legend>Time</legend>
            <div>
              <input name="startTime" type="time" defaultValue="09:00" aria-label="Start time" required />
              <span>–</span>
              <input name="endTime" type="time" defaultValue="12:00" aria-label="End time" required />
            </div>
          </fieldset>
        </div>
        <fieldset className="pricing-options">
          <legend>Pricing</legend>
          <div>
            <label><input type="radio" name="tier" value="standard" defaultChecked /><span>Standard</span></label>
            <label><input type="radio" name="tier" value="premium" /><span>Premium</span></label>
            <label><input type="radio" name="tier" value="corner" /><span>Corner</span></label>
          </div>
        </fieldset>
        <label className="price-field">
          <span aria-hidden="true">$</span>
          <input name="price" type="number" min="0" max="1000" step="0.01" defaultValue="75.00" aria-label="Stall price" required />
        </label>
        <button className="button button--market-dark" type="submit" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create slot'}
        </button>
      </form>
      <a className="portal-back-link" href="/farmers-market/admin/market-dates">← Back to dashboard</a>
    </section>
  )
}
