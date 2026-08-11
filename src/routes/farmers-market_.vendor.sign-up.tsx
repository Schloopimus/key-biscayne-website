import { createFileRoute } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import {
  LocalDemoNote,
  PortalError,
  PortalPageHeading,
  useLocalVendorId,
} from '../components/MarketPortal'
import { createLocalVendorAccount } from '../server/market-vendor.functions'

export const Route = createFileRoute('/farmers-market_/vendor/sign-up')({
  head: () => ({ meta: [{ title: 'Create a Vendor Account | Key Biscayne Farmers Market' }] }),
  component: VendorSignUpPage,
})

function VendorSignUpPage() {
  const { rememberVendorId } = useLocalVendorId()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError('')

    try {
      const result = await createLocalVendorAccount({ data: new FormData(event.currentTarget) })
      rememberVendorId(result.vendorId)
      window.location.href = '/farmers-market/vendor'
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The local vendor profile could not be created.')
      setSubmitting(false)
    }
  }

  return (
    <section className="auth-screen">
      <PortalPageHeading eyebrow="Create your vendor account" title="Let’s get you set up" />
      {error ? <PortalError message={error} /> : null}
      <div className="auth-card">
        <form className="portal-form" onSubmit={submit} aria-busy={submitting}>
          <label>
            <span>Full name</span>
            <input name="fullName" autoComplete="name" placeholder="Your name" required />
          </label>
          <label>
            <span>Email</span>
            <input name="email" type="email" autoComplete="email" placeholder="name@email.com" required />
          </label>
          <label>
            <span>Password</span>
            <input name="password" type="password" autoComplete="new-password" minLength={8} placeholder="Create a password" required />
          </label>
          <button className="button button--market-dark" type="submit" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create an account'}
          </button>
        </form>
        <p className="auth-card__switch">
          Already have an account? <a href="/farmers-market/vendor/login">Log in</a>
        </p>
        <LocalDemoNote>Passwords are validated but never stored. This screen creates only a local vendor profile.</LocalDemoNote>
      </div>
      <a className="portal-back-link" href="/farmers-market">← Back</a>
    </section>
  )
}
