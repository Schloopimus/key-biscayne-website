import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { MarketShell, errorMessage } from '../components/market/MarketShell'
import { readPasswordToken, setVendorPassword } from '../server/market-vendor.functions'

export const Route = createFileRoute('/set-password')({
  head: () => ({ meta: [{ title: 'Set your password | Farmers Market' }] }),
  validateSearch: (search: Record<string, unknown>) => ({ token: typeof search.token === 'string' ? search.token : '' }),
  loaderDeps: ({ search }) => ({ token: search.token }),
  loader: ({ deps }) => readPasswordToken({ data: { token: deps.token } }),
  component: SetPasswordPage,
})

function SetPasswordPage() {
  const { token } = Route.useSearch()
  const { valid, firstName } = Route.useLoaderData()
  const navigate = useNavigate()
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: { preventDefault(): void }) {
    event.preventDefault()
    if (a.length < 8) return setError('Use at least 8 characters.')
    if (a !== b) return setError("The passwords don't match.")
    setBusy(true)
    try {
      await setVendorPassword({ data: { token, password: a, confirm: b } })
      await navigate({ to: '/vendor' })
    } catch (caught) {
      setError(errorMessage(caught))
      setBusy(false)
    }
  }

  return (
    <MarketShell session={null}>
      <main id="main-content" className="fm-screen fm-screen--center fm-bg-mint">
        <div className="fm-narrow">
          {valid ? (
            <>
              <div className="mk-eyebrow fm-gap-16">WELCOME, {(firstName || 'vendor').toUpperCase()}</div>
              <h1 className="fm-title-38 fm-gap-26">Set your password</h1>
              <form className="fm-formcard" onSubmit={submit} noValidate>
                <label className="mk-field">
                  Password
                  <input
                    className="kb-input"
                    type="password"
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={a}
                    onChange={(e) => {
                      setA(e.currentTarget.value)
                      setError('')
                    }}
                  />
                </label>
                <label className="mk-field">
                  Confirm password
                  <input
                    className="kb-input"
                    type="password"
                    autoComplete="new-password"
                    value={b}
                    onChange={(e) => {
                      setB(e.currentTarget.value)
                      setError('')
                    }}
                  />
                </label>
                {error ? (
                  <p role="alert" className="fm-error-text">
                    {error}
                  </p>
                ) : null}
                <button type="submit" className="fm-btn-primary fm-mt-4" disabled={busy}>
                  Set password and continue →
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mk-eyebrow fm-gap-16">FARMERS MARKET</div>
              <h1 className="fm-title-38 fm-gap-14">This link has expired</h1>
              <p className="fm-lede fm-gap-24">Password links work once and expire after 24 hours. Log in, or ask for a new link from the login page.</p>
              <a className="fm-btn-primary fm-block" href="/vendor/login">
                Go to vendor login →
              </a>
            </>
          )}
        </div>
      </main>
    </MarketShell>
  )
}
