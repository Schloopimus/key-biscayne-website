import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, type FormEvent } from 'react'
import { PortalError, PortalPageHeading, StatusPill, useLocalVendorId } from '../components/MarketPortal'
import { getVendorSnapshot, submitVendorApplication } from '../server/market-vendor.functions'
import type { VendorSnapshot } from '../server/market-vendor.functions'

export const Route = createFileRoute('/farmers-market_/vendor/application')({
  head: () => ({ meta: [{ title: 'Vendor Application | Key Biscayne Farmers Market' }] }),
  component: VendorApplicationPage,
})

function VendorApplicationPage() {
  const { vendorId, ready, rememberVendorId } = useLocalVendorId()
  const [snapshot, setSnapshot] = useState<VendorSnapshot | null>(null)
  const [status, setStatus] = useState<'idle' | 'submitting'>('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!ready) return
    getVendorSnapshot({ data: { vendorId } })
      .then(setSnapshot)
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'The application could not be loaded.'))
  }, [ready, vendorId])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === 'submitting') return

    setStatus('submitting')
    setError('')
    const formData = new FormData(event.currentTarget)
    if (vendorId) formData.set('vendorId', vendorId)

    try {
      const result = await submitVendorApplication({ data: formData })
      rememberVendorId(result.vendorId)
      window.location.href = '/farmers-market/vendor'
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The application could not be saved.')
      setStatus('idle')
    }
  }

  if (!ready || !snapshot) return <p className="portal-loading">Loading application…</p>

  const previous = snapshot.application
  if (previous?.status === 'pending' || previous?.status === 'approved') {
    return (
      <>
        <PortalPageHeading eyebrow="Vendor application" title="Application already submitted" />
        <section className="portal-card">
          <div className="portal-card__heading">
            <h2>{previous.businessName}</h2>
            <StatusPill status={previous.status} />
          </div>
          <p>
            {previous.status === 'pending'
              ? 'The local admin must review this application before another revision can be submitted.'
              : 'This vendor is approved. Continue to stall booking.'}
          </p>
          <a className="button button--market-dark" href={previous.status === 'approved' ? '/farmers-market/vendor/stalls' : '/farmers-market/vendor'}>
            Continue →
          </a>
        </section>
      </>
    )
  }

  return (
    <>
      <PortalPageHeading
        eyebrow="Vendor application"
        title={previous?.status === 'rejected' ? 'Submit a revised application' : 'Tell us about your business'}
        body="The market team reviews the business details and health department certificate before stall booking opens."
      />
      {previous?.status === 'rejected' ? (
        <div className="portal-callout portal-callout--danger">
          <strong>Previous review</strong>
          <p>{previous.rejectionReason}</p>
        </div>
      ) : null}
      {error ? <PortalError message={error} /> : null}
      <form className="portal-form portal-card" onSubmit={submit} aria-busy={status === 'submitting'}>
        <div className="field-row">
          <label>
            <span>Business name *</span>
            <input name="businessName" defaultValue={previous?.businessName ?? ''} required />
          </label>
          <label>
            <span>Product category *</span>
            <input name="productCategory" defaultValue={previous?.productCategory ?? ''} placeholder="Produce, prepared goods, flowers…" required />
          </label>
        </div>
        <div className="field-row">
          <label>
            <span>Contact name *</span>
            <input name="contactName" autoComplete="name" defaultValue={snapshot.vendor?.contactName ?? previous?.contactName ?? ''} required />
          </label>
          <label>
            <span>Phone *</span>
            <input name="phone" type="tel" autoComplete="tel" defaultValue={previous?.phone ?? ''} required />
          </label>
        </div>
        <label>
          <span>Email address *</span>
          <input name="email" type="email" autoComplete="email" defaultValue={snapshot.vendor?.email ?? previous?.email ?? ''} required />
        </label>
        <label>
          <span>Business details *</span>
          <textarea name="details" rows={6} defaultValue={previous?.details ?? ''} placeholder="Describe what you sell and anything the market team should know." required />
        </label>
        <label>
          <span>Health Department certificate *</span>
          <input name="certificate" type="file" accept="application/pdf,image/png,image/jpeg" required />
          <small>PDF, PNG, or JPEG · 5 MB maximum · stored only in the local demo data directory.</small>
        </label>
        <button className="button button--market-dark" type="submit">
          {status === 'submitting' ? 'Saving application…' : previous ? 'Submit revised application →' : 'Submit application →'}
        </button>
      </form>
    </>
  )
}
