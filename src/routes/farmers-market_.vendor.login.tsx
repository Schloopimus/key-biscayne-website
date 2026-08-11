import { createFileRoute } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import {
  LocalDemoNote,
  PortalError,
  PortalPageHeading,
  useLocalVendorId,
} from '../components/MarketPortal'
import { loginLocalVendorAccount } from '../server/market-vendor.functions'

export const Route = createFileRoute('/farmers-market_/vendor/login')({
  head: () => ({ meta: [{ title: 'Vendor Sign In | Key Biscayne Farmers Market' }] }),
  component: VendorLoginPage,
})

function VendorLoginPage() {
  const { rememberVendorId } = useLocalVendorId()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError('')

    try {
      const result = await loginLocalVendorAccount({ data: new FormData(event.currentTarget) })
      rememberVendorId(result.vendorId)
      window.location.href = '/farmers-market/vendor'
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The local vendor profile could not be opened.')
      setSubmitting(false)
    }
  }

  return (
    <section className="auth-screen">
      <PortalPageHeading eyebrow="Login to your vendor account" title="Sign in" />
      {error ? <PortalError message={error} /> : null}
      <div className="auth-card">
        <form className="portal-form" onSubmit={submit} aria-busy={submitting}>
          <label>
            <span>Email</span>
            <input name="email" type="email" autoComplete="email" placeholder="name@email.com" required />
          </label>
          <label>
            <span>Password</span>
            <input name="password" type="password" autoComplete="current-password" placeholder="Create a password" required />
          </label>
          <button className="button button--market-dark" type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>
        <p className="auth-card__switch">
          Don’t have an account? <a href="/farmers-market/vendor/sign-up">Sign up</a>
        </p>
        <LocalDemoNote>Passwords are not stored or checked. Sign-in selects a local vendor profile by email.</LocalDemoNote>
      </div>
      <a className="portal-back-link" href="/farmers-market">← Back</a>
    </section>
  )
}
