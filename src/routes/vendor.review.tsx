import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { MarketError, errorMessage, signedIn } from '../components/market/MarketShell'
import { STALL_BY_ID } from '../market/plaza'
import { PLANS, electricityPriced, fmtDay, num, quote, type Plan } from '../market/rules'
import { getMapData, reserveStall } from '../server/market-vendor.functions'

type ReviewSearch = { plan: Plan; date: number; stall: number; change?: boolean }

export const Route = createFileRoute('/vendor/review')({
  head: () => ({ meta: [{ title: 'Review your booking | Farmers Market' }] }),
  validateSearch: (search: Record<string, unknown>): ReviewSearch => ({
    plan: search.plan === 'seasonal' ? 'seasonal' : 'weekly',
    date: typeof search.date === 'number' && search.date >= 0 && search.date < 5 ? search.date : 0,
    stall: typeof search.stall === 'number' ? search.stall : 0,
    change: search.change === true || search.change === 'true' ? true : undefined,
  }),
  loaderDeps: ({ search }) => ({ change: search.change }),
  loader: ({ deps }) => signedIn(() => getMapData({ data: { change: deps.change } }), 'vendor'),
  errorComponent: ({ error }) => <MarketError error={error} />,
  component: ReviewPage,
})

function ReviewPage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const router = useRouter()
  const stall = STALL_BY_ID.get(search.stall)
  const first = data.saturdays[search.date] ?? data.saturdays[0]!
  const [addons, setAddons] = useState({ tent: false, electricity: false, tables: 0 })
  const [otherExtras, setOtherExtras] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const backToMap = () => navigate({ to: '/vendor/map', search: { plan: search.plan, date: search.date, stall: search.stall, change: search.change } })

  if (!stall) {
    return <MarketError error={new Error('Choose a stall on the market map first.')} />
  }

  const q = quote(data.prices, search.plan, addons, otherExtras)
  const plan = PLANS[search.plan]
  const stock = data.stock
  const elecOut = stock.electricity <= 0 && !addons.electricity
  const tableMinus = addons.tables <= 0
  const tablePlus = addons.tables >= stock.tables

  async function reserve() {
    setBusy(true)
    setError('')
    try {
      await reserveStall({ data: { plan: search.plan, first, stallId: stall!.id, addons, otherExtras, change: !!search.change } })
      await router.invalidate()
      await navigate({ to: '/vendor' })
    } catch (caught) {
      setError(errorMessage(caught))
      setBusy(false)
    }
  }

  const facts = [
    ['PLAN', plan.name],
    ['FIRST SATURDAY', fmtDay(first)],
    ['LENGTH', plan.saturdays > 1 ? `${plan.saturdays} Saturdays` : '1 Saturday'],
    ['STALL PRICE', `$${q.rate} per Saturday`],
  ]

  return (
    <main id="main-content" className="fm-screen fm-screen--page fm-bg-mint">
      <div className="fm-wrap-640">
        <button type="button" className="fm-link-green fm-gap-16" onClick={backToMap}>
          ← Change stall
        </button>
        <div className="mk-eyebrow fm-gap-10">REVIEW YOUR BOOKING</div>
        <h1 className="fm-title-46 fm-gap-24">
          Stall {stall.label} · Zone {stall.zone}
        </h1>
        <div className="fm-reviewcard">
          <div className="mk-g2 fm-facts-grid">
            {facts.map(([label, value]) => (
              <div key={label}>
                <div className="ad-label">{label}</div>
                <div className="ad-val">{value}</div>
              </div>
            ))}
          </div>
          <div className="fm-addons">
            <div className="fm-label-16 fm-gap-12">ADD-ONS (OPTIONAL)</div>
            <div className="fm-addons__list">
              <div className={addons.tent ? 'fm-addon is-on' : 'fm-addon'}>
                <label className="fm-addon__toggle">
                  <input type="checkbox" checked={addons.tent} onChange={() => setAddons((a) => ({ ...a, tent: !a.tent }))} />
                  <span>
                    <span className="fm-addon__name">Tent</span>
                    <span className="fm-addon__note">Per Saturday</span>
                  </span>
                </label>
                <span className="fm-addon__price">${num(data.prices.tent)}</span>
              </div>
              <div className={addons.electricity ? 'fm-addon is-on' : 'fm-addon'}>
                <label className="fm-addon__toggle">
                  <input
                    type="checkbox"
                    checked={addons.electricity}
                    disabled={elecOut}
                    onChange={() => setAddons((a) => ({ ...a, electricity: !a.electricity }))}
                  />
                  <span>
                    <span className="fm-addon__name">Electricity</span>
                    <span className="fm-addon__note">{elecOut ? 'Sold out' : `${stock.electricity} left`}</span>
                  </span>
                </label>
                <span className="fm-addon__price">{electricityPriced(data.prices) ? `$${num(data.prices.electricity)}` : 'TBC'}</span>
              </div>
              <div className={addons.tables > 0 ? 'fm-addon is-on' : 'fm-addon'}>
                <div className="fm-addon__qtytext">
                  <div className="fm-addon__name">Tables</div>
                  <div className="fm-addon__note">{stock.tables > 0 ? `$${num(data.prices.table)} each · ${stock.tables} left` : 'Sold out'}</div>
                </div>
                <div className="fm-stepper">
                  <button type="button" aria-label="Remove one table" disabled={tableMinus} onClick={() => setAddons((a) => ({ ...a, tables: Math.max(0, a.tables - 1) }))}>
                    −
                  </button>
                  <span aria-live="polite">{addons.tables}</span>
                  <button
                    type="button"
                    aria-label="Add one table"
                    disabled={tablePlus}
                    onClick={() => setAddons((a) => ({ ...a, tables: Math.min(stock.tables, a.tables + 1) }))}
                  >
                    +
                  </button>
                </div>
                <span className="fm-addon__price">{addons.tables > 0 ? `$${addons.tables * num(data.prices.table)}` : ''}</span>
              </div>
            </div>
            <label className="fm-extras">
              Other extras
              <textarea
                className="kb-input"
                rows={2}
                value={otherExtras}
                onChange={(e) => setOtherExtras(e.currentTarget.value)}
                placeholder="Tell us what you need. Subject to availability."
              />
            </label>
          </div>

          <div className="fm-quote">
            {q.lines.map((line) => (
              <div key={line.label} className="fm-quote__line">
                <span>{line.label}</span>
                <span>{line.value}</span>
              </div>
            ))}
            <div className="fm-quote__total">
              <span>Due per Saturday</span>
              <span>${q.perSaturday}</span>
            </div>
            <div className="fm-quote__length">{plan.saturdays > 1 ? `Reserves ${plan.saturdays} Saturdays (3-month block)` : 'Reserves this Saturday'}</div>
          </div>
          <p className="fm-quote__note">No payment today. Each Saturday is due by the Monday midnight before it.</p>
          {error ? (
            <p role="alert" className="fm-alert fm-gap-14">
              {error}
            </p>
          ) : null}
          <button type="button" className="fm-btn-reserve" onClick={reserve} disabled={busy}>
            Reserve this stall →
          </button>
        </div>
      </div>
    </main>
  )
}
