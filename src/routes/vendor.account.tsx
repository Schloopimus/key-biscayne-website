import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { ConfirmDialog, errorMessage, showToast, signedIn, type ConfirmRequest } from '../components/market/MarketShell'
import { deleteVendorAccount, getVendorDashboard, requestPasswordChange } from '../server/market-vendor.functions'

export const Route = createFileRoute('/vendor/account')({
  head: () => ({ meta: [{ title: 'Account details | Farmers Market' }] }),
  loader: () => signedIn(() => getVendorDashboard(), 'vendor'),
  component: AccountPage,
})

function AccountPage() {
  const data = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const email = data.me.email
  const hasBooking = !!data.booking

  return (
    <main id="main-content" className="fm-screen fm-screen--page fm-bg-paper">
      <div className="fm-wrap-720">
        <div className="mk-eyebrow fm-gap-12">YOUR ACCOUNT</div>
        <h1 className="fm-title-48 fm-gap-30">Account details</h1>
        <div className="fm-acct">
          <div className="ac-row">
            <div>
              <div className="ad-label">EMAIL</div>
              <div className="ad-val fm-anywhere">{email}</div>
            </div>
          </div>
          <div className="ac-row fm-rule-top">
            <div>
              <div className="ad-label">PASSWORD</div>
              <div className="ad-val" aria-label="Password hidden">
                ••••••••
              </div>
            </div>
            <button
              type="button"
              className="fm-btn-outline-pill"
              onClick={() =>
                setConfirm({
                  title: 'Change your password?',
                  body: `We'll email a link to ${email} so you can set a new password. The link expires after 24 hours.`,
                  keepLabel: 'Cancel',
                  confirmLabel: 'Email me the link',
                  danger: false,
                  run: async () => {
                    try {
                      await requestPasswordChange()
                      showToast(`Password link sent to ${email}.`)
                    } catch (caught) {
                      showToast(errorMessage(caught))
                    }
                  },
                })
              }
            >
              Change password
            </button>
          </div>
        </div>
        <div className="fm-danger">
          <div className="ac-row fm-flush">
            <div className="fm-maxw-420">
              <div className="fm-danger__title">Delete account</div>
              <p className="fm-danger__copy">Permanently removes your account, application and any upcoming reservations.</p>
            </div>
            <button
              type="button"
              className="fm-btn-danger-pill"
              onClick={() =>
                setConfirm({
                  title: 'Delete your account?',
                  body: `This permanently deletes your account and application${
                    hasBooking ? ', and releases your reserved stall and any upcoming Saturdays. Payments are non-refundable' : ''
                  }. This can't be undone.`,
                  keepLabel: 'Keep my account',
                  confirmLabel: 'Yes, delete account',
                  danger: true,
                  run: async () => {
                    try {
                      await deleteVendorAccount()
                      await navigate({ to: '/' })
                      await router.invalidate()
                      showToast('Your account has been deleted.')
                    } catch (caught) {
                      showToast(errorMessage(caught))
                    }
                  },
                })
              }
            >
              Delete account
            </button>
          </div>
        </div>
        <a className="fm-link-green fm-mt-24 fm-inline-block" href="/vendor">
          ← Back to dashboard
        </a>
      </div>
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </main>
  )
}
