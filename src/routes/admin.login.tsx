import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { errorMessage } from '../components/market/MarketShell'
import { logInAdmin } from '../server/market-admin.functions'

export const Route = createFileRoute('/admin/login')({
  head: () => ({ meta: [{ title: 'Admin sign in | Farmers Market' }] }),
  component: AdminLoginPage,
})

function AdminLoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: { preventDefault(): void }) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await logInAdmin({ data: { email, password } })
      await navigate({ to: '/admin' })
    } catch (caught) {
      setError(errorMessage(caught))
      setBusy(false)
    }
  }

  return (
    <main id="main-content" className="fm-screen fm-screen--center fm-bg-mint">
      <div className="fm-narrow">
        <div className="mk-eyebrow fm-admin-eyebrow">MARKET ADMIN</div>
        <h1 className="fm-title-42 fm-gap-30">Admin sign in</h1>
        <form className="fm-formcard" onSubmit={submit}>
          <label className="fm-adminfield">
            <span>EMAIL</span>
            <input className="kb-input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.currentTarget.value)} />
          </label>
          <label className="fm-adminfield">
            <span>PASSWORD</span>
            <input className="kb-input" type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.currentTarget.value)} />
          </label>
          {error ? (
            <p role="alert" className="fm-alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="fm-btn-dark fm-mt-6" disabled={busy}>
            Sign in →
          </button>
        </form>
        <div className="fm-center fm-mt-18">
          <a className="fm-link-faint" href="/">
            ← Back
          </a>
        </div>
      </div>
    </main>
  )
}
