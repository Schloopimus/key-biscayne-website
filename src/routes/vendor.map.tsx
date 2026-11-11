import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { MarketError, errorMessage, showToast, signedIn } from '../components/market/MarketShell'
import { LANDMARKS, STALLS, STALL_BY_ID, ZONES, ZONE_COLORS, ZONE_NOTES, type Stall, type Zone } from '../market/plaza'
import { PLANS, addWeeks, fmtDay, num, type Plan } from '../market/rules'
import { bookSaturday, getMapData } from '../server/market-vendor.functions'

type MapSearch = { rebook?: string; append?: string; change?: boolean; plan?: Plan; date?: number; stall?: number }

export const Route = createFileRoute('/vendor/map')({
  head: () => ({ meta: [{ title: 'Market map | Farmers Market' }] }),
  validateSearch: (search: Record<string, unknown>): MapSearch => ({
    rebook: typeof search.rebook === 'string' ? search.rebook : undefined,
    append: typeof search.append === 'string' ? search.append : undefined,
    change: search.change === true || search.change === 'true' ? true : undefined,
    plan: search.plan === 'seasonal' || search.plan === 'weekly' ? search.plan : undefined,
    date: typeof search.date === 'number' && search.date >= 0 && search.date < 5 ? search.date : undefined,
    stall: typeof search.stall === 'number' ? search.stall : undefined,
  }),
  loaderDeps: ({ search }) => ({ rebook: search.rebook, append: search.append, change: search.change }),
  loader: ({ deps }) => signedIn(() => getMapData({ data: deps }), 'vendor'),
  errorComponent: ({ error }) => <MarketError error={error} />,
  component: MapPage,
})

const STALL_LIST = [...STALLS].sort((a, b) => a.id - b.id)

function useViewport() {
  const [size, setSize] = useState({ w: 1024, h: 800 })
  useEffect(() => {
    const update = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return size
}

const abs = (s: Pick<Stall, 'left' | 'top' | 'width' | 'height'>, inset: number): CSSProperties => ({
  left: `calc(${s.left} + ${inset}px)`,
  top: `calc(${s.top} + ${inset}px)`,
  width: `calc(${s.width} - ${inset * 2}px)`,
  height: `calc(${s.height} - ${inset * 2}px)`,
})

function MapPage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const router = useRouter()
  const viewport = useViewport()
  const rebookMode = !!data.fixedDate
  const [plan, setPlan] = useState<Plan>(search.plan ?? 'weekly')
  const [dateIdx, setDateIdx] = useState(search.date ?? 0)
  const [selectedId, setSelectedId] = useState<number | null>(search.stall ?? null)
  const [hover, setHover] = useState<number | null>(null)
  const [zoneFilter, setZoneFilter] = useState<'all' | Zone>('all')
  const [availOnly, setAvailOnly] = useState(false)
  const [mStep, setMStep] = useState<'plan' | 'zones' | 'stalls'>(rebookMode ? 'zones' : search.stall ? 'stalls' : 'plan')
  const [mZone, setMZone] = useState<Zone | null>(search.stall ? (STALL_BY_ID.get(search.stall)?.zone ?? null) : null)
  const [busy, setBusy] = useState(false)

  const taken = useMemo(() => new Set(data.taken), [data.taken])
  const first = data.saturdays[dateIdx] ?? data.saturdays[0]!
  const dates = useMemo(
    () => (data.fixedDate ? [data.fixedDate] : Array.from({ length: PLANS[plan].saturdays }, (_, i) => addWeeks(first, i))),
    [data.fixedDate, plan, first],
  )
  const isTakenStall = (id: number) => dates.some((d) => taken.has(`${d}:${id}`))
  const hasSelection = selectedId !== null && !isTakenStall(selectedId)
  const selected = hasSelection ? STALL_BY_ID.get(selectedId!)! : null
  const rate = num(data.prices[plan])
  const fixedLabel = data.fixedDate ? fmtDay(data.fixedDate) : ''
  const openCount = STALL_LIST.filter((s) => !isTakenStall(s.id)).length

  const select = (id: number) => {
    if (!isTakenStall(id)) setSelectedId(id)
  }

  function pickForMe() {
    const stall = [...STALL_LIST].sort((a, b) => ZONES.indexOf(a.zone) - ZONES.indexOf(b.zone) || a.id - b.id).find((s) => !isTakenStall(s.id))
    if (stall) {
      setSelectedId(stall.id)
      setMZone(stall.zone)
      setMStep('stalls')
    }
  }

  async function proceed() {
    if (!selected) return
    if (rebookMode) {
      setBusy(true)
      try {
        await bookSaturday({ data: { rebook: search.rebook, append: search.append, stallId: selected.id } })
        await router.invalidate()
        await navigate({ to: '/vendor' })
      } catch (caught) {
        showToast(errorMessage(caught))
        setSelectedId(null)
        await router.invalidate()
        setBusy(false)
      }
      return
    }
    await navigate({ to: '/vendor/review', search: { plan, date: dateIdx, stall: selected.id, change: search.change } })
  }

  const chip = (active: boolean) => (active ? 'fm-chip is-active' : 'fm-chip')
  const planChips = (Object.keys(PLANS) as Array<Plan>).map((key) => (
    <button key={key} type="button" className={key === plan ? 'fm-seg is-active' : 'fm-seg'} onClick={() => setPlan(key)}>
      {PLANS[key].chip} · ${num(data.prices[key])}
    </button>
  ))
  const dateSelect = (extra?: string) => (
    <select className={`kb-input${extra ? ` ${extra}` : ''}`} value={String(dateIdx)} onChange={(e) => setDateIdx(Number(e.currentTarget.value))}>
      {data.saturdays.map((d, i) => (
        <option key={d} value={i}>
          {fmtDay(d)}
        </option>
      ))}
    </select>
  )

  const zoneCards = ZONES.map((z) => {
    const open = STALL_LIST.filter((s) => s.zone === z && !isTakenStall(s.id)).length
    return (
      <button
        key={z}
        type="button"
        className={open ? 'fm-zonecard' : 'fm-zonecard is-full'}
        disabled={open === 0}
        onClick={() => {
          setMZone(z)
          setMStep('stalls')
        }}
      >
        <span aria-hidden="true" className="fm-zonecard__swatch" style={{ background: ZONE_COLORS[z] }} />
        <span className="fm-zonecard__text">
          <span className="fm-zonecard__name">Zone {z}</span>
          <span className="fm-zonecard__note">{ZONE_NOTES[z]}</span>
        </span>
        <span className="fm-zonecard__open">{open ? `${open} open` : 'Full'}</span>
      </button>
    )
  })

  const church = LANDMARKS.filter((l) => l.church)
  const miniFill = (s: Stall) => (s.id === selectedId ? '#2f7a56' : isTakenStall(s.id) ? '#d5dad3' : ZONE_COLORS[s.zone])
  const zoneLabelStall = (z: Zone) => {
    const zs = STALL_LIST.filter((s) => s.zone === z)
    return zs[Math.floor(zs.length / 2)]!
  }

  const mZoneAll = STALL_LIST.filter((s) => s.zone === mZone)
  const mTaken = mZoneAll.filter((s) => isTakenStall(s.id)).length
  const mOpen = mZoneAll.filter((s) => !isTakenStall(s.id))
  const zoneMeta = `${mOpen.length} open${mTaken ? ` · ${mTaken} taken` : ''}`
  const summary = rebookMode ? `Choosing a stall for ${fixedLabel}` : `${PLANS[plan].name} · from ${fmtDay(first)}`
  const zoomed = mStep === 'stalls' && !!mZone

  // Tablet zoom: one zone at finger size, scrolling sideways when it is wider than the screen.
  const zoom = useMemo(() => {
    if (!zoomed) return null
    const pad = 8
    const minX = Math.min(...mZoneAll.map((z) => z.x1)) - pad
    const maxX = Math.max(...mZoneAll.map((z) => z.x2)) + pad
    const minY = Math.min(...mZoneAll.map((z) => z.y1)) - pad
    const maxY = Math.max(...mZoneAll.map((z) => z.y2)) + pad
    const availW = Math.min(viewport.w, 1280) - 110
    const fit = Math.min(availW / (maxX - minX), (viewport.h * 0.5) / (maxY - minY))
    const sc = Math.max(fit, 1.15)
    return { minX, minY, sc, swipe: (maxX - minX) * sc > availW, w: Math.round((maxX - minX) * sc), h: Math.round((maxY - minY) * sc) }
  }, [zoomed, mZoneAll, viewport])

  const stallLook = (s: Stall) => {
    const isTaken = isTakenStall(s.id)
    const isSelected = s.id === selectedId && !isTaken
    return { isTaken, isSelected, className: isTaken ? 'is-taken' : isSelected ? 'is-selected' : undefined }
  }

  return (
    <main id="main-content" className="mp-screen">
      <div className="fm-map__head">
        <div>
          <div className="fm-kicker fm-gap-10">PICK YOUR SPOT</div>
          <h1 className="fm-map__title">Market map</h1>
        </div>
      </div>

      {rebookMode ? <p className="fm-map__rebook">Choose any open stall for {fixedLabel}.</p> : null}

      {/* Phones: plan → zone → stall */}
      <div className="mp-mobile">
        {mStep === 'plan' && !rebookMode ? (
          <>
            <a className="fm-link-green fm-mobile-back" href="/vendor">
              ← Back to dashboard
            </a>
            <h2 className="fm-mobile-h">How often will you sell?</h2>
            <div className="fm-plancards">
              {(Object.keys(PLANS) as Array<Plan>).map((k) => (
                <button key={k} type="button" aria-pressed={plan === k} className={plan === k ? 'fm-plancard is-on' : 'fm-plancard'} onClick={() => setPlan(k)}>
                  <span className="fm-plancard__top">
                    <span className="fm-plancard__name">{k === 'weekly' ? 'Weekly' : 'Seasonal'}</span>
                    <span className="fm-plancard__price">
                      ${num(data.prices[k])} <span>/ Saturday</span>
                    </span>
                  </span>
                  <span className="fm-plancard__desc">{k === 'weekly' ? 'Book one Saturday at a time.' : 'A 3-month block of 13 Saturdays, paid monthly.'}</span>
                </button>
              ))}
            </div>
            <label className="mk-field fm-gap-22">
              First Saturday
              {dateSelect()}
            </label>
            <button type="button" className="fm-btn-primary fm-w100" onClick={() => setMStep('zones')}>
              See open stalls →
            </button>
          </>
        ) : null}

        {mStep === 'zones' || (mStep === 'plan' && rebookMode) ? (
          <>
            <div className="fm-msummary">
              <span>{summary}</span>
              {!rebookMode ? (
                <button type="button" className="ad-link" onClick={() => setMStep('plan')}>
                  Change
                </button>
              ) : null}
            </div>
            <div className="mp-mini" aria-hidden="true">
              {church.map((l) => (
                <div key={l.label} className="fm-mini-church" style={{ left: l.left, top: l.top, width: l.width, height: l.height }} />
              ))}
              {STALL_LIST.map((s) => (
                <div key={s.id} className="fm-mini-stall" style={{ ...abs(s, 1), background: miniFill(s) }} />
              ))}
              {ZONES.map((z) => {
                const mid = zoneLabelStall(z)
                return (
                  <div key={z} className="fm-mini-label" style={{ left: mid.left, top: mid.top, width: mid.width, height: mid.height }}>
                    {z}
                  </div>
                )
              })}
            </div>
            <h2 className="fm-mobile-h fm-mobile-h--zones">Choose a zone</h2>
            <div className="fm-zonecards">{zoneCards}</div>
            <button type="button" className="fm-btn-outline fm-w100 fm-mt-14" onClick={pickForMe}>
              Pick a stall for me
            </button>
          </>
        ) : null}

        {zoomed ? (
          <>
            <button type="button" className="fm-link-green fm-mobile-back" onClick={() => setMStep('zones')}>
              ← All zones
            </button>
            <div className="fm-mzone__head">
              <h2 className="fm-mobile-h fm-mobile-h--flush">Zone {mZone}</h2>
              <span>{zoneMeta}</span>
            </div>
            <div className="fm-mzone__grid">
              {mOpen.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={s.id === selectedId}
                  aria-label={`Stall ${s.label}`}
                  className={s.id === selectedId ? 'fm-mstall is-on' : 'fm-mstall'}
                  onClick={() => select(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>

      {/* Tablets and touch screens: overview map that zooms into a zone */}
      <div className="mp-tablet">
        {!rebookMode ? (
          <div className="fm-tablet__controls">
            <div>
              <div className="ad-label">PLAN</div>
              <div className="fm-segs">{planChips}</div>
            </div>
            <label className="mk-field fm-minw200">
              First Saturday
              {dateSelect('fm-select-compact')}
            </label>
          </div>
        ) : null}
        <div className={zoomed ? 'mp-tgrid mp-tgrid-zoomed' : 'mp-tgrid'}>
          <div className="fm-tablet__card">
            {!zoomed ? (
              <>
                <div className="fm-tablet__hint">Tap a zone to zoom in.</div>
                <div className="mp-mini fm-noborder">
                  {church.map((l) => (
                    <div key={l.label} className="fm-mini-church" style={{ left: l.left, top: l.top, width: l.width, height: l.height }} />
                  ))}
                  {STALL_LIST.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      tabIndex={-1}
                      aria-hidden="true"
                      className="fm-mini-stall fm-mini-stall--button"
                      style={{ ...abs(s, 1), background: miniFill(s) }}
                      onClick={() => {
                        setMZone(s.zone)
                        setMStep('stalls')
                      }}
                    />
                  ))}
                  {ZONES.map((z) => {
                    const mid = zoneLabelStall(z)
                    return (
                      <button
                        key={z}
                        type="button"
                        tabIndex={-1}
                        aria-hidden="true"
                        className="fm-mini-label fm-mini-label--button"
                        style={{ left: mid.left, top: mid.top, width: mid.width, height: mid.height }}
                        onClick={() => {
                          setMZone(z)
                          setMStep('stalls')
                        }}
                      >
                        {z}
                      </button>
                    )
                  })}
                </div>
              </>
            ) : (
              <>
                <button type="button" className="fm-link-green fm-gap-8" onClick={() => setMStep('zones')}>
                  ← All zones
                </button>
                <div className="fm-tzone__head">
                  <div>
                    <span className="fm-tzone__title">Zone {mZone}</span> <span className="fm-tzone__note">{mZone ? ZONE_NOTES[mZone] : ''}</span>
                  </div>
                  <span className="fm-tzone__meta">{zoneMeta} · shown where they sit at the market</span>
                </div>
                {zoom?.swipe ? <div className="fm-tzone__swipe">Swipe sideways to see the whole zone →</div> : null}
                <div className="fm-tzone__scroll">
                  {zoom ? (
                    <div role="group" aria-label={`Zone ${mZone} stalls`} className="fm-tzone__box" style={{ width: zoom.w, height: zoom.h }}>
                      {mZoneAll.map((s) => {
                        const look = stallLook(s)
                        return (
                          <button
                            key={s.id}
                            type="button"
                            className={`fm-tstall${look.className ? ` ${look.className}` : ''}`}
                            aria-label={`Stall ${s.label}, ${look.isTaken ? 'taken' : look.isSelected ? 'selected' : 'open'}`}
                            aria-pressed={look.isSelected}
                            disabled={look.isTaken}
                            onClick={() => select(s.id)}
                            style={{
                              left: Math.round((s.x1 - zoom.minX) * zoom.sc) + 3,
                              top: Math.round((s.y1 - zoom.minY) * zoom.sc) + 3,
                              width: Math.round((s.x2 - s.x1) * zoom.sc) - 6,
                              height: Math.round((s.y2 - s.y1) * zoom.sc) - 6,
                            }}
                          >
                            {s.label}
                          </button>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
          <div className="fm-minw0">
            {!zoomed ? (
              <>
                <h2 className="fm-mobile-h fm-mobile-h--tablet">Choose a zone</h2>
                <div className="fm-zonecards">{zoneCards}</div>
                <button type="button" className="fm-btn-outline fm-w100 fm-mt-12" onClick={pickForMe}>
                  Pick a stall for me
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Mouse screens: full map and stall list */}
      <div className="mp-body mp-desktop">
        <div className="mp-mappane">
          {!rebookMode ? (
            <div className="fm-gap-16">
              <div className="fm-label-16">CHOOSE YOUR FIRST SATURDAY</div>
              <div className="mp-chiprow fm-datechips">
                {data.saturdays.map((d, i) => (
                  <button key={d} type="button" className={i === dateIdx ? 'fm-datechip is-active' : 'fm-datechip'} onClick={() => setDateIdx(i)}>
                    {fmtDay(d)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mp-canvas" role="group" aria-label="Market map. Church Building at the bottom.">
            {LANDMARKS.map((l) => (
              <div
                key={l.label}
                aria-hidden="true"
                className={l.church ? 'fm-landmark fm-landmark--church' : 'fm-landmark'}
                style={{ left: l.left, top: l.top, width: l.width, height: l.height, background: l.background }}
              >
                {l.label}
              </div>
            ))}
            {STALL_LIST.map((s) => {
              const look = stallLook(s)
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`mp-stall${look.className ? ` ${look.className}` : ''}${hover === s.id && !look.isTaken ? ' is-hover' : ''}`}
                  aria-label={`Stall ${s.label}, Zone ${s.zone}, ${look.isTaken ? 'taken' : look.isSelected ? 'selected' : 'open'}`}
                  aria-pressed={look.isSelected}
                  disabled={look.isTaken}
                  onClick={() => select(s.id)}
                  onMouseEnter={() => setHover(s.id)}
                  onMouseLeave={() => setHover(null)}
                  style={abs(s, 2)}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mp-listpane">
          <div className="fm-key" aria-label="Map key">
            <span>
              <span aria-hidden="true" className="fm-key__open" />
              Open
            </span>
            <span>
              <span aria-hidden="true" className="fm-key__sel" />
              Your selection
            </span>
            <span>
              <span aria-hidden="true" className="fm-key__taken" />
              Taken
            </span>
          </div>
          {!rebookMode ? (
            <div className="fm-gap-18">
              <div className="fm-label-16">PLAN</div>
              <div className="fm-segs">{planChips}</div>
            </div>
          ) : null}
          <div className="fm-list__rule" />
          <div className="fm-list__head">
            <div className="fm-list__title">All stalls</div>
            <div className="fm-list__count">{openCount} open</div>
          </div>
          <div className="fm-zonechips">
            {(['all', ...ZONES] as const).map((z) => (
              <button key={z} type="button" aria-pressed={zoneFilter === z} className={chip(zoneFilter === z)} onClick={() => setZoneFilter(z)}>
                {z === 'all' ? 'All zones' : `Zone ${z}`}
              </button>
            ))}
          </div>
          <label className="fm-availonly">
            <input type="checkbox" checked={availOnly} onChange={(e) => setAvailOnly(e.currentTarget.checked)} />
            Show open stalls only
          </label>
          {ZONES.filter((z) => zoneFilter === 'all' || zoneFilter === z).map((z) => {
            const rows = STALL_LIST.filter((s) => s.zone === z && (!availOnly || !isTakenStall(s.id)))
            if (!rows.length) return null
            return (
              <div key={z} className="fm-gap-14">
                <div className="fm-group__title">ZONE {z}</div>
                <div className="fm-group__grid">
                  {rows.map((s) => {
                    const look = stallLook(s)
                    return (
                      <button
                        key={s.id}
                        type="button"
                        aria-pressed={look.isSelected}
                        disabled={look.isTaken}
                        className={`fm-listrow${look.className ? ` ${look.className}` : ''}${hover === s.id ? ' is-hover' : ''}`}
                        onClick={() => select(s.id)}
                        onMouseEnter={() => setHover(s.id)}
                        onMouseLeave={() => setHover(null)}
                      >
                        <span className="fm-listrow__label">{s.label}</span>
                        <span className="fm-listrow__state">{look.isTaken ? 'Taken' : look.isSelected ? 'Selected' : 'Open'}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {ZONES.filter((z) => zoneFilter === 'all' || zoneFilter === z).every((z) =>
            STALL_LIST.filter((s) => s.zone === z && (!availOnly || !isTakenStall(s.id))).length === 0,
          ) ? (
            <p className="fm-list__empty">No open stalls match. Try another zone or date.</p>
          ) : null}
        </div>
      </div>

      <div className={selected ? 'mp-bar' : 'mp-bar mp-bar-empty'}>
        {selected ? (
          <>
            <div aria-live="polite">
              <div className="fm-bar__title">
                Stall {selected.label} · Zone {selected.zone}
              </div>
              <div className="fm-bar__sub">{rebookMode ? `For ${fixedLabel}` : `${PLANS[plan].name} · $${rate} / Saturday · first Saturday ${fmtDay(first)}`}</div>
            </div>
            <button type="button" className="fm-btn-primary fm-bar__go" onClick={proceed} disabled={busy}>
              {rebookMode ? `Book for ${fixedLabel} →` : 'Continue →'}
            </button>
          </>
        ) : (
          <>
            <div className="fm-bar__hint">Select an open stall on the map or in the list.</div>
            <a className="fm-link-muted" href="/vendor">
              ← Back to dashboard
            </a>
          </>
        )}
      </div>
    </main>
  )
}

