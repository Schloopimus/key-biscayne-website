import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { ConfirmDialog, errorMessage, showToast, signedIn, type ConfirmRequest } from '../components/market/MarketShell'
import { StatusBadge, statusKey } from '../components/market/StatusBadge'
import { stallLabel } from '../market/plaza'
import { PLANS, fmtDay, fmtLong, fmtMoment, isActiveStatus, isLate, paymentDueAt, saturdayOpensAt } from '../market/rules'
import {
  cancelSaturdays,
  getVendorDashboard,
  reserveNextSaturday,
  type DashboardRow,
  type VendorDashboard,
} from '../server/market-vendor.functions'

export const Route = createFileRoute('/vendor/')({
  head: () => ({ meta: [{ title: 'Vendor dashboard | Farmers Market' }] }),
  loader: () => signedIn(() => getVendorDashboard(), 'vendor'),
  component: VendorDashboardPage,
})

const pillLook: Record<DashboardRow['status'], [string, string, string]> = {
  due: ['#fdf3d6', '#6f5608', 'PAYMENT DUE'],
  confirming: ['#e4eef8', '#245a8c', 'CONFIRMING'],
  paid: ['#e5f3ea', '#22613f', 'PAID'],
  waived: ['#e5f3ea', '#22613f', 'PAID'],
  cancelled: ['#f2f4f1', '#5c7267', 'CANCELLED'],
  released: ['#fbe9e7', '#a3413a', 'RELEASED'],
}

const isPaid = (status: DashboardRow['status']) => status === 'paid' || status === 'waived' || status === 'confirming'

function defaultPay(rows: Array<DashboardRow>, plan: 'weekly' | 'seasonal') {
  return rows
    .filter((r) => r.status === 'due')
    .slice(0, plan === 'seasonal' ? 4 : 1)
    .map((r) => r.id)
}

function lateConsequence(lateCount: number, newLate: number) {
  const total = lateCount + newLate
  if (!newLate) return "You're giving at least 72 hours' notice, so this won't count against you."
  if (total >= 2) return 'This is less than 72 hours away and brings you to two cancellations without notice, so you will permanently lose your space.'
  return `This is less than 72 hours away, so it counts as a cancellation without notice (${total} of 2). A second one means permanent loss of your space.`
}

function ReservationCard({ data, ask }: { data: VendorDashboard; ask: (request: ConfirmRequest) => void }) {
  const booking = data.booking!
  const router = useRouter()
  const navigate = useNavigate()
  const now = Date.now()
  const rows = booking.rows
  const [paySelected, setPaySelected] = useState(() => defaultPay(rows, booking.plan))
  const [nextSatError, setNextSatError] = useState<{ date: string; message: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const dueRows = rows.filter((r) => r.status === 'due')
  const payRows = dueRows.filter((r) => paySelected.includes(r.id))
  const payCount = payRows.length
  const allSelected = dueRows.length > 0 && payCount === dueRows.length
  const lastPicked = payRows.length ? payRows[payRows.length - 1]!.date : ''
  const skipped = dueRows.filter((r) => !paySelected.includes(r.id) && r.date < lastPicked)
  const payAmount = booking.perSaturday * payCount
  const noActive = rows.length > 0 && !rows.some((r) => isActiveStatus(r.status))
  const hasPaid = rows.some((r) => isPaid(r.status))
  const allPaid = rows.length > 0 && dueRows.length === 0 && !rows.some((r) => r.status === 'confirming')
  const badge = noActive
    ? ['#f2f4f1', '#5c7267', 'NO ACTIVE SATURDAYS']
    : allPaid
      ? ['#e5f3ea', '#22613f', 'PAID']
      : rows.some((r) => r.status === 'confirming')
        ? ['#e4eef8', '#245a8c', 'CONFIRMING PAYMENT']
        : hasPaid
          ? ['#e5f3ea', '#22613f', 'PARTLY PAID']
          : ['#fdf3d6', '#6f5608', 'RESERVED · PAYMENT DUE']
  const futureActive = rows.filter((r) => isActiveStatus(r.status) && now < saturdayOpensAt(r.date))
  const nextActive = rows.find((r) => isActiveStatus(r.status))
  const satWord = payCount === 1 ? 'Saturday' : 'Saturdays'
  const dueText = (r: DashboardRow) => (now > paymentDueAt(r.date) ? 'Due now' : `Due by midnight, ${fmtMoment(paymentDueAt(r.date))}`)

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    try {
      await action()
      await router.invalidate()
    } catch (caught) {
      showToast(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  function askCancel(row: DashboardRow) {
    const late = isLate(row.date)
    ask({
      title: `Cancel ${fmtDay(row.date)}?`,
      body: `${lateConsequence(data.lateCancellations, late ? 1 : 0)}${isPaid(row.status) ? ' This Saturday is paid, and payments are non-refundable.' : ''}`,
      keepLabel: 'Keep this Saturday',
      confirmLabel: 'Yes, cancel Saturday',
      danger: true,
      run: () => run(() => cancelSaturdays({ data: { bookingId: row.id } })),
    })
  }

  function askCancelAll() {
    const late = futureActive.filter((r) => isLate(r.date)).length
    const paid = futureActive.filter((r) => isPaid(r.status)).length
    ask({
      title: 'Cancel your whole reservation?',
      body: `This cancels ${futureActive.length} upcoming ${futureActive.length === 1 ? 'Saturday' : 'Saturdays'} and releases your stall. ${lateConsequence(data.lateCancellations, late)}${
        paid ? ` ${paid} paid ${paid === 1 ? 'Saturday is' : 'Saturdays are'} included, and payments are non-refundable.` : ''
      }`,
      keepLabel: 'Keep reservation',
      confirmLabel: 'Yes, cancel reservation',
      danger: true,
      run: () => run(() => cancelSaturdays({ data: { all: true } })),
    })
  }

  async function addSaturday() {
    setBusy(true)
    try {
      const result = await reserveNextSaturday()
      setNextSatError(result.ok ? null : { date: result.date, message: result.message })
      await router.invalidate()
    } catch (caught) {
      showToast(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fm-panel fm-panel--dash">
      <div className="fm-res__head">
        <div>
          <div className="fm-label-14">YOUR RESERVED STALL</div>
          <div className="fm-res__title">
            Stall {stallLabel(booking.stallId)} — {PLANS[booking.plan].name}
          </div>
          <div className="fm-res__sub">
            ${booking.perSaturday} per Saturday · {booking.summary}
          </div>
        </div>
        <div className="fm-badge" style={{ background: badge[0], color: badge[1] }}>
          {badge[2]}
        </div>
      </div>

      <div className="fm-mt-24">
        <div className="fm-res__rowshead">
          <div className="fm-label-14">YOUR SATURDAYS</div>
          {dueRows.length > 1 ? (
            <button type="button" className="ad-link" onClick={() => setPaySelected(allSelected ? [] : dueRows.map((r) => r.id))}>
              {allSelected ? 'Clear all' : 'Select all'}
            </button>
          ) : null}
        </div>
        <div className="fm-res__rows">
          {rows.map((r) => {
            const look = pillLook[r.status]
            const checked = paySelected.includes(r.id)
            const future = now < saturdayOpensAt(r.date)
            const label = r.stallId !== booking.stallId ? `${fmtDay(r.date)} · Stall ${stallLabel(r.stallId)}` : fmtDay(r.date)
            const detail =
              r.status === 'due'
                ? dueText(r)
                : r.status === 'confirming'
                  ? 'Waiting for payment confirmation'
                  : r.status === 'paid' || r.status === 'waived'
                    ? `$${booking.perSaturday} received`
                    : r.status === 'released'
                      ? 'Not paid by the deadline'
                      : 'Cancelled by you'
            const selected = r.status === 'due' && checked
            return (
              <div key={r.id} className={selected ? 'fm-res__row is-selected' : 'fm-res__row'}>
                {r.status === 'due' ? (
                  <label className="fm-res__check">
                    <input
                      type="checkbox"
                      checked={checked}
                      aria-label={`Pay for ${label}`}
                      onChange={() => setPaySelected((s) => (s.includes(r.id) ? s.filter((x) => x !== r.id) : [...s, r.id]))}
                    />
                    <span>
                      <span className="fm-res__date">{label}</span>
                      <span className="fm-res__detail">{detail}</span>
                    </span>
                  </label>
                ) : (
                  <div className="fm-res__info">
                    <div className="fm-res__date">{label}</div>
                    <div className="fm-res__detail">{detail}</div>
                  </div>
                )}
                <span className="fm-pill-sm" style={{ background: look[0], color: look[1] }}>
                  {look[2]}
                </span>
                {(r.status === 'released' || r.status === 'cancelled') && future ? (
                  <button
                    type="button"
                    className="fm-btn-again"
                    onClick={() => navigate({ to: '/vendor/map', search: { rebook: r.id } })}
                  >
                    Book again
                  </button>
                ) : null}
                {isActiveStatus(r.status) && future ? (
                  <button type="button" className="fm-cancel-link" onClick={() => askCancel(r)}>
                    {isLate(r.date) ? 'Cancel (under 72 hours)' : 'Cancel'}
                  </button>
                ) : null}
              </div>
            )
          })}
        </div>

        {skipped.length > 0 ? (
          <p role="status" className="fm-warn">
            {skipped.length === 1
              ? `${fmtDay(skipped[0]!.date)} isn't selected. It will be released if it isn't paid by its deadline.`
              : `${skipped.length} earlier Saturdays aren't selected. They will be released if they aren't paid by their deadlines.`}
          </p>
        ) : null}

        <div className="fm-paybar">
          {dueRows.length > 0 ? (
            <>
              <div className="fm-minw0">
                <div className="fm-paybar__title">{payCount ? `${payCount} ${satWord} selected · $${payAmount}` : 'No Saturdays selected'}</div>
                <div className="fm-paybar__sub">
                  Next payment: {fmtDay(dueRows[0]!.date)}, {dueText(dueRows[0]!).toLowerCase()}
                </div>
              </div>
              <button
                type="button"
                className="fm-paybar__button"
                disabled={payCount === 0}
                onClick={() => navigate({ to: '/vendor/payment', search: { days: payRows.map((r) => r.id).join(',') } })}
              >
                {payCount ? `Pay $${payAmount} for ${payCount} ${satWord} →` : 'Select a Saturday to pay'}
              </button>
            </>
          ) : (
            <div className="fm-paybar__none">Nothing to pay right now.</div>
          )}
        </div>

        {booking.plan === 'weekly' ? (
          <>
            <button type="button" className="fm-btn-next" onClick={addSaturday} disabled={busy}>
              Reserve the next Saturday
            </button>
            {nextSatError ? (
              <div role="alert" className="fm-nextsat">
                <span>{nextSatError.message}</span>
                <button type="button" onClick={() => navigate({ to: '/vendor/map', search: { append: nextSatError.date } })}>
                  Choose another stall →
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="fm-res__rules">
        Cancellations without notice: {data.lateCancellations} of 2. Give at least 72 hours' notice. Two Saturdays cancelled without notice result in permanent
        loss of your space. Payments are non-refundable.
      </div>

      <div className="fm-res__actions">
        {!hasPaid && !noActive ? (
          <button type="button" className="fm-btn-change" onClick={() => navigate({ to: '/vendor/map', search: { change: true } })}>
            Change stall
          </button>
        ) : null}
        {!noActive ? (
          <button type="button" className="fm-btn-cancelall" onClick={askCancelAll} disabled={busy}>
            {nextActive && isLate(nextActive.date) ? 'Cancel reservation (under 72 hours)' : 'Cancel reservation'}
          </button>
        ) : null}
      </div>
    </div>
  )
}

const TRACKER = ['Account created', 'Business details', 'Documents', 'Agreements', 'Under review', 'Approved']

function VendorDashboardPage() {
  const data = Route.useLoaderData()
  const { me } = data
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const status = statusKey(me)
  const submitted = me.status === 'pending' || me.status === 'approved'
  const trackerDone = [true, me.detailsDone || submitted, me.documentsDone || submitted, submitted, me.status === 'approved', me.status === 'approved']
  const current = trackerDone.indexOf(false)
  const finishLabel = me.detailsDone ? 'Continue application →' : 'Finish application →'
  const noActive = !data.booking || !data.booking.rows.some((r) => isActiveStatus(r.status))
  const canBook = noActive && !data.spaceLost && data.holds === 0
  const steps = useMemo(() => TRACKER, [])

  return (
    <main id="main-content" className="fm-screen fm-screen--page fm-bg-paper">
      <div className="fm-wrap-1080">
        <div className="fm-kicker">VENDOR DASHBOARD</div>
        <h1 className="fm-title-50">Welcome back</h1>

        {data.notice ? (
          <div role="status" className="fm-notice">
            {data.notice}
          </div>
        ) : null}

        {data.booking ? <ReservationCard key={data.booking.rows.map((r) => r.id + r.status).join()} data={data} ask={setConfirm} /> : null}

        <div className="fm-panel fm-panel--dash">
          <div className="fm-status__head">
            <div>
              <div className="fm-label-14 fm-label-grey">APPLICATION STATUS</div>
              <StatusBadge status={status} />
            </div>
          </div>

          {me.status === 'in_progress' || me.status === 'pending' ? (
            <ol aria-label="Application progress" className="fm-tracker">
              {steps.map((label, i) => {
                const done = trackerDone[i]
                const cur = i === current
                return (
                  <li key={label} className={done || cur ? 'is-on' : undefined}>
                    <span aria-hidden="true" className={done ? 'fm-dot is-done' : cur ? 'fm-dot is-current' : 'fm-dot'}>
                      {done ? '✓' : i + 1}
                    </span>
                    {label}
                    <span className="fm-sr">{done ? '(done)' : cur ? '(current step)' : ''}</span>
                  </li>
                )
              })}
            </ol>
          ) : null}

          {me.status === 'in_progress' ? (
            <>
              <p className="fm-status__copy fm-gap-20">
                Your account is set up. Finish your application to start booking: business details, documents and agreements. Your progress is saved as you go.
              </p>
              <a className="fm-btn-pill" href="/vendor/application">
                {finishLabel}
              </a>
            </>
          ) : null}
          {me.status === 'pending' ? (
            <p className="fm-status__copy">Thanks, your application is under review. We'll email you once it's approved, usually within 2–3 business days.</p>
          ) : null}
          {status === 'approved' ? (
            <>
              <p className="fm-status__copy fm-gap-20">
                You're approved to sell at the market.{me.approvedUntil ? ` Your approval runs until ${fmtLong(me.approvedUntil)}.` : ''} Head to the plaza map to
                pick your stall.
              </p>
              {canBook ? (
                <a className="fm-btn-pill" href="/vendor/map">
                  Book a stall →
                </a>
              ) : null}
            </>
          ) : null}
          {status === 'expired' ? (
            <p className="fm-status__copy">
              Your approval expired on {me.approvedUntil ? fmtLong(me.approvedUntil) : ''}. Please contact the market office to renew it before booking.
            </p>
          ) : null}
          {me.status === 'rejected' ? (
            <>
              <p className="fm-status__copy fm-gap-20">
                We weren't able to approve your application. Please review your details and documents and resubmit, or contact the market office.
              </p>
              <a className="fm-btn-pill fm-btn-pill--light" href="/vendor/application">
                Update application →
              </a>
            </>
          ) : null}
        </div>

        <div className="fm-panel fm-panel--dash">
          <div className="fm-label-14 fm-label-grey fm-gap-18">HOW APPROVAL WORKS</div>
          <div className="fm-how">
            <div>
              <div className="fm-how__title">1. Apply</div>
              <p>Join, then add your business details, documents and agreements.</p>
            </div>
            <div>
              <div className="fm-how__title">2. Review</div>
              <p>Our team verifies your documents within 2–3 business days.</p>
            </div>
            <div>
              <div className="fm-how__title">3. Book</div>
              <p>Once approved, reserve your stall on the plaza map any week.</p>
            </div>
          </div>
        </div>

        <div className="fm-center">
          <a className="fm-link-muted" href="/">
            ← Back to market info
          </a>
        </div>
      </div>
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </main>
  )
}
