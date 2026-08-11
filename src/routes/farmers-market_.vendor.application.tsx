import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, type FormEvent } from 'react'
import { PortalEmptyState, PortalError, PortalPageHeading, StatusPill, useLocalVendorId } from '../components/MarketPortal'
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
  if (!snapshot.vendor) {
    return (
      <PortalEmptyState
        title="Create your vendor account first"
        body="The application is connected to a local vendor profile."
        action={<a className="button button--market-dark" href="/farmers-market/vendor/sign-up">Create an account →</a>}
      />
    )
  }

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
    <section className="application-screen">
      <PortalPageHeading
        eyebrow="Vendor application"
        title={previous?.status === 'rejected' ? 'Update your application' : 'Tell us about your business'}
      />
      {previous?.status === 'rejected' ? (
        <div className="portal-callout portal-callout--danger">
          <strong>Previous review</strong>
          <p>{previous.rejectionReason}</p>
        </div>
      ) : null}
      {error ? <PortalError message={error} /> : null}
      <form className="portal-form application-form" onSubmit={submit} aria-busy={status === 'submitting'}>
        <label>
          <span>Business name</span>
          <input name="businessName" defaultValue={previous?.businessName ?? ''} placeholder="Enter your business name" required />
        </label>
        <label>
          <span>Product category</span>
          <input name="productCategory" defaultValue={previous?.productCategory ?? ''} placeholder="E.g. baked goods, produce, flowers" required />
        </label>
        <div className="field-row">
          <label>
            <span>Contact name</span>
            <input name="contactName" autoComplete="name" defaultValue={snapshot.vendor.contactName} placeholder="Full Name" required />
          </label>
          <label>
            <span>Phone</span>
            <input name="phone" type="tel" autoComplete="tel" defaultValue={previous?.phone ?? ''} placeholder="(000) 000-0000" required />
          </label>
        </div>
        <input name="email" type="hidden" value={snapshot.vendor.email} />
        <div className="file-upload-field">
          <span>Health Department certificate</span>
          <label className="file-upload-control">
            <input name="certificate" type="file" accept="application/pdf,image/png,image/jpeg" required />
            <span>Click to upload PDF or image</span>
            <strong>Upload</strong>
          </label>
        </div>
        <label>
          <span>Anything else we should know</span>
          <textarea name="details" rows={5} defaultValue={previous?.details ?? ''} placeholder="Any details that you want to share about the business" required />
        </label>
        <button className="button button--market-dark" type="submit">
          {status === 'submitting' ? 'Submitting…' : 'Submit application'}
        </button>
      </form>
      <a className="portal-back-link" href="/farmers-market/vendor">← Back to dashboard</a>
    </section>
  )
}
