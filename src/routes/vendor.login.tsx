import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { errorMessage, showToast } from '../components/market/MarketShell'
import { logInVendor, requestPasswordReset } from '../server/market-vendor.functions'

export const Route = createFileRoute('/vendor/login')({
  head: () => ({ meta: [{ title: 'Vendor login | Farmers Market' }] }),
  component: VendorLoginPage,
})

function VendorLoginPage() {
  const navigate = useNavigate()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: { preventDefault(): void }) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await logInVendor({ data: { email, password } })
      await router.invalidate()
      await navigate({ to: '/vendor' })
    } catch (caught) {
      setError(errorMessage(caught))
      setBusy(false)
    }
  }

  async function forgot() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Enter your email above, then choose Forgot password.')
    await requestPasswordReset({ data: { email } })
    showToast(`If ${email.trim()} has an account, we've sent it a link to set a new password.`)
  }

  return (
    <main id="main-content" className="fm-screen fm-screen--center fm-bg-mint">
      <div className="fm-narrow">
        <div className="mk-eyebrow fm-gap-20">EXISTING VENDORS</div>
        <h1 className="fm-title-42 fm-gap-30">Vendor login</h1>
        <form className="fm-formcard" onSubmit={submit}>
          <label className="mk-field">
            Email
            <input className="kb-input" type="email" required autoComplete="email" placeholder="you@business.com" value={email} onChange={(e) => setEmail(e.currentTarget.value)} />
          </label>
          <label className="mk-field">
            Password
            <input className="kb-input" type="password" required autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.currentTarget.value)} />
          </label>
          {error ? (
            <p role="alert" className="fm-alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="fm-btn-primary fm-mt-6" disabled={busy}>
            Log in →
          </button>
          <button type="button" className="ad-link fm-self-start" onClick={forgot}>
            Forgot password?
          </button>
        </form>
        <div className="fm-below">
          <a className="fm-below__back" href="/">
            ← Back
          </a>
          <a className="fm-below__apply" href="/#market-apply">
            New vendor? Apply
          </a>
        </div>
      </div>
    </main>
  )
}
