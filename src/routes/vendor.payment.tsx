import { createFileRoute, redirect, useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { errorMessage, showToast, signedIn } from '../components/market/MarketShell'
import { stallLabel } from '../market/plaza'
import { fmtDay } from '../market/rules'
import { getPaymentSummary, submitPayment } from '../server/market-vendor.functions'

export const Route = createFileRoute('/vendor/payment')({
  head: () => ({ meta: [{ title: 'Payment | Farmers Market' }] }),
  validateSearch: (search: Record<string, unknown>) => ({ days: typeof search.days === 'string' ? search.days : '' }),
  loaderDeps: ({ search }) => ({ days: search.days }),
  loader: async ({ deps }) => {
    const summary = await signedIn(() => getPaymentSummary({ data: { ids: deps.days.split(',').filter(Boolean) } }), 'vendor')
    if (!summary) throw redirect({ to: '/vendor' })
    return summary
  },
  component: PaymentPage,
})

function PaymentPage() {
  const summary = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const rows = summary.rows
  const amount = rows.reduce((total, row) => total + row.amount, 0)
  const dates = rows.length > 3 ? `${fmtDay(rows[0]!.date)} to ${fmtDay(rows[rows.length - 1]!.date)}` : rows.map((r) => fmtDay(r.date)).join(' · ')

  async function pay() {
    setBusy(true)
    try {
      await submitPayment({ data: { ids: rows.map((r) => r.id) } })
      await router.invalidate()
      await navigate({ to: '/vendor' })
    } catch (caught) {
      showToast(errorMessage(caught))
      setBusy(false)
    }
  }

  return (
    <main id="main-content" className="fm-screen fm-screen--center fm-payment">
      <div className="fm-paycard">
        <div className="fm-paycard__eyebrow">
          STALL {stallLabel(summary.stallId)} · {rows.length} SATURDAY PAYMENT
        </div>
        <div className="fm-paycard__amount">${amount}.00</div>
        <div className="fm-paycard__dates">{dates}</div>
        <p className="fm-paycard__copy">
          You'll be sent to our secure payment page. These Saturdays show as paid once your payment is confirmed. Payments are non-refundable.
        </p>
        <button type="button" className="fm-paycard__go" onClick={pay} disabled={busy}>
          Continue to payment →
        </button>
        <a className="fm-paycard__back" href="/vendor">
          Back to dashboard
        </a>
      </div>
    </main>
  )
}
