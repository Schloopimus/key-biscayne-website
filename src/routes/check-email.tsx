import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { MarketShell, SIGNUP_STORAGE_KEY } from '../components/market/MarketShell'

export const Route = createFileRoute('/check-email')({
  head: () => ({ meta: [{ title: 'Check your email | Farmers Market' }] }),
  component: CheckEmailPage,
})

function CheckEmailPage() {
  const [signup, setSignup] = useState<{ email: string; link: string | null } | null>(null)

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(SIGNUP_STORAGE_KEY)
      if (stored) setSignup(JSON.parse(stored) as { email: string; link: string | null })
    } catch {
      setSignup(null)
    }
  }, [])

  return (
    <MarketShell session={null}>
      <main id="main-content" className="fm-screen fm-screen--center fm-bg-mint">
        <div className="fm-card-480">
          <div className="mk-eyebrow fm-gap-16">YOU'RE IN</div>
          <h1 className="fm-title-38 fm-gap-14">Check your email</h1>
          <p className="fm-lede fm-gap-24">
            We sent a link to <strong>{signup?.email ?? 'your email address'}</strong>. Use it to set your password, then finish your application from your
            dashboard.
          </p>
          {signup?.link ? (
            <a className="fm-btn-primary fm-block" href={signup.link}>
              Open the email link (prototype)
            </a>
          ) : null}
          <a className="fm-btn-quiet fm-block" href="/">
            ← Back to the market page
          </a>
        </div>
      </main>
    </MarketShell>
  )
}
