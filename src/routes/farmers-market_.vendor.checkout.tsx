import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  LocalDemoNote,
  PortalError,
  PortalPageHeading,
  formatMarketDate,
  formatMoney,
  useLocalVendorId,
} from '../components/MarketPortal'
import {
  completeLocalPayment,
  getLocalCheckout,
  type LocalCheckout,
} from '../server/market-vendor.functions'

export const Route = createFileRoute('/farmers-market_/vendor/checkout')({
  head: () => ({ meta: [{ title: 'Complete Stall Booking | Key Biscayne Farmers Market' }] }),
  component: LocalCheckoutPage,
})

function LocalCheckoutPage() {
  const { vendorId, ready } = useLocalVendorId()
  const [checkout, setCheckout] = useState<LocalCheckout | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving'>('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!ready) return
    const bookingId = new URLSearchParams(window.location.search).get('booking')
    if (!vendorId || !bookingId) {
      setError('Open this page from a reserved stall.')
      return
    }
    getLocalCheckout({ data: { vendorId, bookingId } })
      .then(setCheckout)
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'The reservation could not be loaded.'))
  }, [ready, vendorId])

  async function completePayment() {
    if (!vendorId || !checkout || status === 'saving') return
    setStatus('saving')
    setError('')
    try {
      await completeLocalPayment({ data: { vendorId, bookingId: checkout.bookingId } })
      window.location.href = '/farmers-market/vendor'
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The local payment state could not be updated.')
      setStatus('idle')
    }
  }

  if (!ready || (!checkout && !error)) return <p className="portal-loading">Loading checkout…</p>

  return (
    <section className="checkout-screen">
      <PortalPageHeading eyebrow="Complete your booking" title="Payment" body="Review your stall reservation before continuing." />
      {error ? <PortalError message={error} /> : null}
      {checkout ? (
        <div className="checkout-layout">
          <section className="checkout-card">
            <p className="portal-label">Stall reservation</p>
            <h2>Stall {checkout.stallCode}</h2>
            <dl>
              <div><dt>Market date</dt><dd>{formatMarketDate(checkout.marketDate)}</dd></div>
              <div><dt>Stall type</dt><dd>{checkout.tier}</dd></div>
              <div><dt>Booking length</dt><dd>Single date</dd></div>
            </dl>
          </section>
          <aside className="checkout-summary">
            <p className="portal-label">Order summary</p>
            <div><span>Stall {checkout.stallCode}</span><span>{formatMoney(checkout.priceCents)}</span></div>
            <div className="checkout-summary__total"><strong>Total</strong><strong>{formatMoney(checkout.priceCents)}</strong></div>
            {checkout.paymentStatus === 'complete' ? (
              <a className="button button--market-dark" href="/farmers-market/vendor">Return to dashboard →</a>
            ) : (
              <button className="button button--market-dark" type="button" onClick={completePayment} disabled={status === 'saving'}>
                {status === 'saving' ? 'Completing…' : `Complete demo payment · ${formatMoney(checkout.priceCents)}`}
              </button>
            )}
            <LocalDemoNote>No payment provider is connected. This button only updates the local demo booking state.</LocalDemoNote>
          </aside>
        </div>
      ) : null}
      <a className="portal-back-link" href="/farmers-market/vendor/stalls">← Back to plaza map</a>
    </section>
  )
}
