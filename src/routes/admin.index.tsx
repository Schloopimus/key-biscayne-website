import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { ConfirmDialog, errorMessage, showToast, signedIn, type ConfirmRequest } from '../components/market/MarketShell'
import { DocumentList, FieldList, documentRows } from '../components/market/VendorRecord'
import { STALLS, stallLabel } from '../market/plaza'
import { ackKeys, bookingAmount, fmtDay, fmtDayYear, fmtLong, fmtMoment, num, tomorrow, vendorTypeLabel, type Plan } from '../market/rules'
import {
  approveVendor,
  deleteBooking,
  getAdminData,
  logOutAdmin,
  placeHold,
  rejectVendor,
  releaseHold,
  removeCancellation,
  saveBooking,
  saveSetting,
  setStallClosed,
  type AdminData,
} from '../server/market-admin.functions'

type Tab = 'vendors' | 'bookings' | 'pricing'
type AdminSearch = { tab?: Tab; vendor?: string; date?: string }

export const Route = createFileRoute('/admin/')({
  head: () => ({ meta: [{ title: 'Market admin | Farmers Market' }] }),
  validateSearch: (search: Record<string, unknown>): AdminSearch => ({
    tab: search.tab === 'bookings' || search.tab === 'pricing' ? search.tab : undefined,
    vendor: typeof search.vendor === 'string' ? search.vendor : undefined,
    date: typeof search.date === 'string' ? search.date : undefined,
  }),
  loader: () => signedIn(() => getAdminData(), 'admin'),
  component: AdminDashboardPage,
})

type Vendor = AdminData['vendors'][number]
type Booking = AdminData['bookings'][number]
type Payment = Booking['payment']

const VENDOR_LOOK: Record<string, [string, string, string]> = {
  in_progress: ['#e4eef8', '#245a8c', 'INCOMPLETE'],
  expired: ['#fbe9e7', '#a3413a', 'APPROVAL EXPIRED'],
  pending: ['#fdf3d6', '#6f5608', 'PENDING'],
  approved: ['#e5f3ea', '#22613f', 'APPROVED'],
  rejected: ['#fbe9e7', '#a3413a', 'REJECTED'],
}
const PAY_LOOK: Record<Payment, [string, string, string]> = {
  due: ['#fdf3d6', '#6f5608', 'Payment due'],
  confirming: ['#e4eef8', '#245a8c', 'Confirming'],
  paid: ['#e5f3ea', '#22613f', 'Paid'],
  waived: ['#eef0ec', '#3f5a4c', 'Waived'],
}
const dispStatus = (v: Vendor) => (v.expired ? 'expired' : v.status)
const addonText = (b: Pick<Booking, 'tent' | 'tables' | 'electricity'>) =>
  [b.tent ? 'Tent' : '', b.tables > 0 ? `Tables (${b.tables})` : '', b.electricity ? 'Electricity' : ''].filter(Boolean).join(', ') || 'None'
const planText = (p: Plan) => (p === 'seasonal' ? 'Seasonal' : 'Weekly')

function Pill({ look }: { look: [string, string, string] }) {
  return (
    <span className="fm-pill-xs" style={{ background: look[0], color: look[1] }}>
      {look[2]}
    </span>
  )
}

// ---------- Booking editor ----------

type Editor = {
  id: string | null
  online: boolean
  date: string
  stallId: string
  vendorId: string
  walkIn: string
  plan: Plan
  amount: string
  tent: boolean
  tables: string
  electricity: boolean
  payment: Payment
  note: string
  repeat: boolean
  error: string
  confirmDelete: boolean
}

function BookingEditor({ data, editor, setEditor, onSaved }: { data: AdminData; editor: Editor; setEditor: (e: Editor | null) => void; onSaved: (date: string) => void }) {
  const [busy, setBusy] = useState(false)
  const closures = new Set(data.closures)
  const isUnavailable = (date: string, stallId: number) =>
    closures.has(`${date}:${stallId}`) || data.bookings.some((b) => b.date === date && b.stallId === stallId && b.id !== editor.id)
  const vendorOptions = data.vendors.filter((v) => dispStatus(v) === 'approved' || v.id === editor.vendorId)
  const stallOptions = [...STALLS].filter((s) => s.id === Number(editor.stallId) || !isUnavailable(editor.date, s.id))
  const update = (patch: Partial<Editor>) => {
    const next = { ...editor, ...patch, error: '', confirmDelete: false }
    if (!next.online && ['plan', 'tent', 'tables', 'electricity', 'stallId'].some((k) => k in patch)) {
      next.amount = String(bookingAmount(data.prices, next.plan, { tent: next.tent, tables: num(next.tables), electricity: next.electricity }))
    }
    setEditor(next)
  }

  async function save(event: { preventDefault(): void }) {
    event.preventDefault()
    if (!editor.vendorId) return setEditor({ ...editor, error: 'Choose who this booking is for.' })
    if (editor.vendorId === 'walkin' && !editor.walkIn.trim()) return setEditor({ ...editor, error: 'Enter a name for this manual booking.' })
    setBusy(true)
    try {
      const result = await saveBooking({
        data: {
          id: editor.id,
          date: editor.date,
          stallId: Number(editor.stallId),
          vendorId: editor.vendorId,
          walkIn: editor.walkIn,
          plan: editor.plan,
          amount: num(editor.amount),
          tent: editor.tent,
          tables: num(editor.tables),
          electricity: editor.electricity,
          payment: editor.payment,
          note: editor.note,
          repeat: editor.repeat,
        },
      })
      setEditor(null)
      onSaved(result.date)
    } catch (caught) {
      setEditor({ ...editor, error: errorMessage(caught) })
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!editor.id) return
    if (!editor.confirmDelete) return setEditor({ ...editor, confirmDelete: true })
    setBusy(true)
    try {
      await deleteBooking({ data: { id: editor.id } })
      setEditor(null)
      onSaved(editor.date)
    } catch (caught) {
      setEditor({ ...editor, error: errorMessage(caught) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button type="button" aria-label="Close booking editor" className="fm-drawer__scrim" onClick={() => setEditor(null)} />
      <form className="fm-drawer" onSubmit={save}>
        <div className="fm-drawer__head">
          <h2>{editor.id ? 'Edit booking' : 'New booking'}</h2>
          <button type="button" aria-label="Close" onClick={() => setEditor(null)}>
            ×
          </button>
        </div>
        {editor.online ? (
          <p className="fm-drawer__locked">
            Reserved online. The price and add-ons come from the vendor's reservation. Changing the vendor, date or stall removes this Saturday from their dashboard.
          </p>
        ) : null}
        <label className="mk-field">
          Booked by
          <select className="kb-input" value={editor.vendorId} onChange={(e) => update({ vendorId: e.currentTarget.value })}>
            <option value="">Choose a vendor</option>
            {vendorOptions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.business}
              </option>
            ))}
            <option value="walkin">Someone else (manual booking)</option>
          </select>
        </label>
        {editor.vendorId === 'walkin' ? (
          <label className="mk-field">
            Name or business
            <input className="kb-input" placeholder="Who is this booking for?" value={editor.walkIn} onChange={(e) => update({ walkIn: e.currentTarget.value })} />
          </label>
        ) : null}
        <div className="mk-formrow">
          <label className="mk-field">
            Date
            <select className="kb-input fm-pad-12" value={editor.date} onChange={(e) => update({ date: e.currentTarget.value })}>
              {data.dates.map((d) => (
                <option key={d} value={d}>
                  {fmtDayYear(d)}
                </option>
              ))}
            </select>
          </label>
          <label className="mk-field">
            Stall
            <select className="kb-input fm-pad-12" value={editor.stallId} onChange={(e) => update({ stallId: e.currentTarget.value })}>
              {stallOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} · Zone {s.zone}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mk-formrow">
          <label className="mk-field">
            Plan
            <select className="kb-input fm-pad-12" disabled={editor.online} value={editor.plan} onChange={(e) => update({ plan: e.currentTarget.value as Plan })}>
              <option value="weekly">Weekly</option>
              <option value="seasonal">Seasonal</option>
            </select>
          </label>
          <label className="mk-field">
            Payment
            <select className="kb-input fm-pad-12" value={editor.payment} onChange={(e) => update({ payment: e.currentTarget.value as Payment })}>
              {(['due', 'confirming', 'paid', 'waived'] as const)
                .filter((p) => !editor.online || p !== 'waived')
                .map((p) => (
                  <option key={p} value={p}>
                    {PAY_LOOK[p][2]}
                  </option>
                ))}
            </select>
          </label>
        </div>
        {!editor.id && editor.plan === 'seasonal' ? (
          <label className="fm-check">
            <input type="checkbox" checked={editor.repeat} onChange={(e) => update({ repeat: e.currentTarget.checked })} />
            Book all 13 Saturdays in the block
          </label>
        ) : null}
        <div className="fm-drawer__addons">
          <label className="fm-check fm-pb-12">
            <input type="checkbox" disabled={editor.online} checked={editor.tent} onChange={(e) => update({ tent: e.currentTarget.checked })} />
            Tent
          </label>
          <label className="fm-check fm-pb-12">
            <input type="checkbox" disabled={editor.online} checked={editor.electricity} onChange={(e) => update({ electricity: e.currentTarget.checked })} />
            Electricity
          </label>
          <label className="mk-field fm-w92">
            Tables
            <input className="kb-input fm-pad-10" type="number" min={0} disabled={editor.online} value={editor.tables} onChange={(e) => update({ tables: e.currentTarget.value })} />
          </label>
        </div>
        <label className="mk-field">
          Amount per Saturday
          <span className="ad-money">
            <span>$</span>
            <input className="kb-input" type="number" min={0} disabled={editor.online} value={editor.amount} onChange={(e) => update({ amount: e.currentTarget.value })} />
          </span>
        </label>
        <label className="mk-field">
          Admin note
          <textarea className="kb-input fm-noresize" rows={2} value={editor.note} onChange={(e) => update({ note: e.currentTarget.value })} />
        </label>
        {editor.error ? (
          <p role="alert" className="fm-alert">
            {editor.error}
          </p>
        ) : null}
        <button type="submit" className="fm-btn-primary" disabled={busy}>
          {editor.id ? 'Save changes' : 'Create booking'}
        </button>
        {editor.id ? (
          <button type="button" className="fm-btn-delete" onClick={remove} disabled={busy}>
            {editor.confirmDelete ? 'Confirm: delete this booking' : 'Delete booking'}
          </button>
        ) : null}
      </form>
    </>
  )
}

// ---------- Approval dialog ----------

function ApproveDialog({ vendor, onClose, onSaved }: { vendor: Vendor; onClose: () => void; onSaved: () => void }) {
  const editing = vendor.status === 'approved'
  const [date, setDate] = useState(vendor.approvedUntil ? new Date(vendor.approvedUntil).toLocaleDateString('en-CA', { timeZone: 'America/New_York' }) : '')
  const [reason, setReason] = useState(vendor.expiryReason)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function save(event: { preventDefault(): void }) {
    event.preventDefault()
    if (!date) return setError('Choose an expiry date.')
    if (date < tomorrow()) return setError('The expiry date must be in the future.')
    if (!reason.trim()) return setError('Add a reason for this expiry date.')
    setBusy(true)
    try {
      await approveVendor({ data: { vendorId: vendor.id, date, reason } })
      onClose()
      onSaved()
    } catch (caught) {
      setError(errorMessage(caught))
      setBusy(false)
    }
  }

  return (
    <div className="fm-modal" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <button type="button" className="fm-modal__scrim" aria-label="Close" tabIndex={-1} onClick={onClose} />
      <form className="fm-modal__panel fm-modal__panel--form" role="dialog" aria-modal="true" aria-labelledby="approve-title" onSubmit={save} noValidate>
        <div>
          <h2 id="approve-title" className="fm-modal__title fm-gap-6">
            {editing ? 'Change approval expiry' : 'Approve vendor'}
          </h2>
          <p className="fm-modal__sub">{vendor.business} can book Saturdays until this date.</p>
        </div>
        <label className="mk-field">
          Approval expires on
          <input
            className="kb-input"
            type="date"
            min={tomorrow()}
            value={date}
            autoFocus
            onChange={(e) => {
              setDate(e.currentTarget.value)
              setError('')
            }}
          />
        </label>
        <label className="mk-field">
          Reason for this expiry date
          <textarea
            className="kb-input fm-noresize"
            rows={3}
            placeholder="e.g. Insurance certificate expires on this date"
            value={reason}
            onChange={(e) => {
              setReason(e.currentTarget.value)
              setError('')
            }}
          />
        </label>
        {error ? (
          <p role="alert" className="fm-alert">
            {error}
          </p>
        ) : null}
        <div className="fm-modal__actions">
          <button type="button" className="fm-btn-keep" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="fm-btn-confirm" disabled={busy}>
            {editing ? 'Save expiry' : 'Approve vendor'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ---------- Pricing ----------

function MoneyInput({ label, field, initial, placeholder, plain, onSaved }: { label: string; field: Parameters<typeof saveSetting>[0]['data']['field']; initial: string; placeholder?: string; plain?: boolean; onSaved: () => void }) {
  const [value, setValue] = useState(initial)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const input = (
    <input
      className="kb-input"
      type="number"
      min={0}
      aria-label={label}
      placeholder={placeholder}
      value={value}
      onChange={(e) => {
        const next = e.currentTarget.value
        setValue(next)
        clearTimeout(timer.current)
        timer.current = setTimeout(async () => {
          try {
            await saveSetting({ data: { field, value: next } })
            onSaved()
          } catch (caught) {
            showToast(errorMessage(caught))
          }
        }, 400)
      }}
    />
  )
  if (plain) return input
  return (
    <label className="ad-money">
      <span>$</span>
      {input}
    </label>
  )
}

// ---------- Page ----------

function AdminDashboardPage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const router = useRouter()
  const tab: Tab = search.tab ?? 'vendors'
  const adminDate = search.date && data.dates.includes(search.date) ? search.date : data.dates[0]!
  const [vendorQuery, setVendorQuery] = useState('')
  const [vendorFilter, setVendorFilter] = useState('all')
  const [stallFilter, setStallFilter] = useState<'all' | 'booked' | 'open' | 'closed'>('all')
  const [holdDraft, setHoldDraft] = useState('')
  const [editor, setEditor] = useState<Editor | null>(null)
  const [approving, setApproving] = useState<Vendor | null>(null)
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)

  const go = (patch: AdminSearch) => navigate({ to: '/admin', search: { ...search, ...patch } })
  const refresh = () => router.invalidate()
  async function act(action: () => Promise<unknown>) {
    try {
      await action()
      await refresh()
    } catch (caught) {
      showToast(errorMessage(caught))
    }
  }

  const closures = new Set(data.closures)
  const vendorName = (b: Booking) => (b.vendorId ? (data.vendors.find((v) => v.id === b.vendorId)?.business ?? 'Unknown vendor') : b.walkIn)
  const upcomingFor = (id: string) => data.bookings.filter((b) => b.vendorId === id && b.date > data.today)

  const openNew = (opts: { date?: string; stallId?: number; vendorId?: string }) => {
    const date = opts.date ?? adminDate
    const stallId = opts.stallId ?? STALLS.find((s) => !closures.has(`${date}:${s.id}`) && !data.bookings.some((b) => b.date === date && b.stallId === s.id))?.id ?? STALLS[0]!.id
    setEditor({
      id: null,
      online: false,
      date,
      stallId: String(stallId),
      vendorId: opts.vendorId ?? '',
      walkIn: '',
      plan: 'weekly',
      amount: String(bookingAmount(data.prices, 'weekly', { tent: false, tables: 0, electricity: false })),
      tent: false,
      tables: '0',
      electricity: false,
      payment: 'due',
      note: '',
      repeat: false,
      error: '',
      confirmDelete: false,
    })
  }
  const openEdit = (b: Booking) =>
    setEditor({
      id: b.id,
      online: b.online,
      date: b.date,
      stallId: String(b.stallId),
      vendorId: b.vendorId ?? 'walkin',
      walkIn: b.walkIn,
      plan: b.plan,
      amount: String(b.amount),
      tent: b.tent,
      tables: String(b.tables),
      electricity: b.electricity,
      payment: b.payment,
      note: b.note,
      repeat: false,
      error: '',
      confirmDelete: false,
    })

  const bookedOnDate = data.bookings.filter((b) => b.date === adminDate).length
  const stats: Array<{ key: Tab; tabLabel: string; label: string; value: string | number; sub: string }> = [
    { key: 'vendors', tabLabel: 'Vendors', label: 'VENDORS', value: data.vendors.length, sub: `${data.vendors.filter((v) => v.status === 'pending').length} pending review` },
    { key: 'bookings', tabLabel: 'Stall bookings', label: 'STALL BOOKINGS', value: bookedOnDate, sub: `booked on ${fmtDay(adminDate)}` },
    { key: 'pricing', tabLabel: 'Pricing', label: 'PRICING', value: `$${num(data.prices.weekly)} / $${num(data.prices.seasonal)}`, sub: 'weekly / seasonal' },
  ]

  const vq = vendorQuery.trim().toLowerCase()
  const vendorRows = data.vendors.filter((v) => {
    const ok = vendorFilter === 'all' || (vendorFilter === 'hold' ? v.holds.length > 0 : v.status === vendorFilter)
    return ok && (!vq || v.business.toLowerCase().includes(vq) || v.contact.toLowerCase().includes(vq))
  })
  const detail = tab === 'vendors' && search.vendor ? data.vendors.find((v) => v.id === search.vendor) : undefined

  const dateIdx = data.dates.indexOf(adminDate)
  const stallRows = [...STALLS].map((s) => {
    const booking = data.bookings.find((b) => b.date === adminDate && b.stallId === s.id)
    const closed = closures.has(`${adminDate}:${s.id}`)
    return { stall: s, booking, closed, state: booking ? 'booked' : closed ? 'closed' : 'open' }
  })

  async function signOut() {
    await logOutAdmin()
    await navigate({ to: '/' })
  }

  return (
    <main id="main-content" className="fm-screen fm-screen--page fm-bg-paper">
      <div className="fm-wrap-1180">
        <div className="fm-admin__head">
          <div>
            <div className="fm-kicker fm-gap-12">MARKET ADMIN</div>
            <h1 className="fm-title-46">Dashboard</h1>
          </div>
          <button type="button" className="fm-link-faint" onClick={signOut}>
            ← Exit admin
          </button>
        </div>

        <nav className="fm-admintabs" aria-label="Admin sections">
          {stats.map((c) => (
            <button
              key={c.key}
              type="button"
              aria-current={c.key === tab ? 'page' : undefined}
              className={c.key === tab ? 'fm-admintab is-active' : 'fm-admintab'}
              onClick={() => go({ tab: c.key, vendor: undefined })}
            >
              {c.tabLabel}
            </button>
          ))}
        </nav>

        <div className="ad-stats">
          {stats.map((c) => (
            <button key={c.key} type="button" aria-pressed={c.key === tab} className={c.key === tab ? 'fm-stat is-active' : 'fm-stat'} onClick={() => go({ tab: c.key, vendor: undefined })}>
              <div className="fm-stat__label">{c.label}</div>
              <div className="fm-stat__value">{c.value}</div>
              <div className="fm-stat__sub">{c.sub}</div>
            </button>
          ))}
        </div>

        {tab === 'vendors' && !detail ? (
          <>
            <div className="fm-toolbar">
              <input
                className="kb-input fm-maxw-280"
                aria-label="Search vendors"
                placeholder="Search business or contact"
                value={vendorQuery}
                onChange={(e) => setVendorQuery(e.currentTarget.value)}
              />
              <div className="fm-tabs">
                {[
                  ['all', 'All'],
                  ['in_progress', 'Incomplete'],
                  ['pending', 'Pending'],
                  ['approved', 'Approved'],
                  ['rejected', 'Rejected'],
                  ['hold', 'On hold'],
                ].map(([key, label]) => (
                  <button key={key} type="button" className={vendorFilter === key ? 'fm-tab is-active' : 'fm-tab'} onClick={() => setVendorFilter(key!)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="fm-tablecard">
              <div className="ad-table fm-minw-860">
                <div className="ad-vrow fm-thead">
                  <div>VENDOR</div>
                  <div>STATUS</div>
                  <div>NEXT BOOKING</div>
                  <div>BALANCE DUE</div>
                  <div>HOLDS</div>
                </div>
                {vendorRows.map((v) => {
                  const up = upcomingFor(v.id)
                  const due = up.filter((b) => b.payment === 'due').reduce((n, b) => n + b.amount, 0)
                  return (
                    <button key={v.id} type="button" className="ad-vrow ad-vbtn" onClick={() => go({ vendor: v.id })}>
                      <div>
                        <div className="fm-cell-strong">{v.business}</div>
                        <div className="fm-cell-sub">
                          {v.category} · {v.contact}
                        </div>
                      </div>
                      <div>
                        <Pill look={VENDOR_LOOK[dispStatus(v)]!} />
                        <div className="fm-cell-note">
                          {v.status === 'approved' && v.approvedUntil ? `${v.expired ? 'Expired' : 'Until'} ${fmtMoment(v.approvedUntil)}` : ''}
                        </div>
                      </div>
                      <div className="fm-cell">{up.length ? `${fmtDay(up[0]!.date)} · ${stallLabel(up[0]!.stallId)}` : 'None'}</div>
                      <div className="fm-cell fm-cell--bold">${due}</div>
                      <div>{v.holds.length ? <Pill look={['#fdf3d6', '#6f5608', `${v.holds.length} on hold`]} /> : <span className="fm-cell-none">None</span>}</div>
                    </button>
                  )
                })}
                {vendorRows.length === 0 ? <div className="fm-table-empty">{data.vendors.length ? 'No vendors match your search.' : 'No vendors have joined yet.'}</div> : null}
              </div>
            </div>
          </>
        ) : null}

        {detail ? (
          <>
            <button type="button" className="fm-link-green fm-gap-16" onClick={() => go({ vendor: undefined })}>
              ← All vendors
            </button>
            <div className="fm-panel-lg">
              <div className="fm-vd__head">
                <div>
                  <div className="fm-vd__titlerow">
                    <h2 className="fm-vd__title">{detail.business}</h2>
                    <Pill look={VENDOR_LOOK[dispStatus(detail)]!} />
                  </div>
                  <div className="fm-vd__cat">{detail.category}</div>
                </div>
                <div className="fm-vd__actions">
                  {detail.status === 'pending' || detail.status === 'rejected' ? (
                    <button type="button" className="fm-btn-approve" onClick={() => setApproving(detail)}>
                      Approve
                    </button>
                  ) : null}
                  {detail.status !== 'rejected' && detail.status !== 'in_progress' ? (
                    <button type="button" className="fm-btn-reject" onClick={() => act(() => rejectVendor({ data: { vendorId: detail.id } }))}>
                      Reject
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="mk-g4 fm-vd__facts">
                <div>
                  <div className="ad-label">CONTACT</div>
                  <div className="ad-val">{detail.contact}</div>
                </div>
                <div>
                  <div className="ad-label">EMAIL</div>
                  <div className="ad-val fm-anywhere">{detail.email}</div>
                </div>
                <div>
                  <div className="ad-label">PHONE</div>
                  <div className="ad-val">{detail.phone}</div>
                </div>
                <div>
                  <div className="ad-label">VENDOR TYPE</div>
                  <div className="ad-val">{vendorTypeLabel(detail.category)}</div>
                </div>
              </div>
              {detail.status === 'approved' && detail.approvedUntil ? (
                <div className={detail.expired ? 'fm-approval is-expired' : 'fm-approval'}>
                  <div>
                    <strong>
                      {detail.expired ? 'Approval expired' : 'Approved until'} {fmtLong(detail.approvedUntil)}
                    </strong>{' '}
                    · {detail.expiryReason}
                  </div>
                  <button type="button" className="ad-link" onClick={() => setApproving(detail)}>
                    Change expiry
                  </button>
                </div>
              ) : null}
              {detail.status === 'in_progress' ? (
                <p className="fm-waiting">Waiting for the vendor to finish their application. It can be approved once it's submitted.</p>
              ) : null}
            </div>

            <div className="fm-panel-sm fm-gap-18">
              <div className="ad-section fm-gap-16">Application</div>
              <div className="ad-split fm-gap-split">
                <div className="fm-stack-14">
                  <FieldList
                    fields={[
                      ['BUSINESS ADDRESS', detail.address],
                      ['WEBSITE OR SOCIAL MEDIA', detail.website],
                      ['PRODUCTS', detail.products],
                      ['PRICE RANGE', detail.priceRange],
                      ['TARGET MARKET', detail.targetMarket],
                      ['NOTES', detail.notes],
                    ]}
                  />
                </div>
                <div>
                  <div className="ad-label fm-gap-10">DOCUMENTS</div>
                  <div className="fm-gap-16">
                    <DocumentList rows={documentRows(detail)} missing="Not provided" missingTone="alert" />
                  </div>
                  <div className="ad-label">AGREEMENTS</div>
                  <div className="fm-acks">{detail.acksAccepted ? `All ${ackKeys(detail.category).length} accepted` : 'Not yet accepted'}</div>
                </div>
              </div>
            </div>

            <div className="ad-split">
              <div className="fm-panel-sm">
                <div className="fm-vd__bookhead">
                  <div className="ad-section">Upcoming bookings</div>
                  <button type="button" className="fm-btn-small" onClick={() => openNew({ vendorId: dispStatus(detail) === 'approved' ? detail.id : '' })}>
                    Add booking
                  </button>
                </div>
                <div className="fm-stack-8">
                  {upcomingFor(detail.id).map((b) => (
                    <div key={b.id} className="fm-vd__booking">
                      <div>
                        <div className="fm-cell-strong fm-cell-strong--14">
                          {fmtDay(b.date)} · Stall {stallLabel(b.stallId)}
                        </div>
                        <div className="fm-cell-sub">
                          {planText(b.plan)} · ${b.amount} · {addonText(b)}
                        </div>
                      </div>
                      <div className="fm-vd__bookend">
                        <Pill look={PAY_LOOK[b.payment]} />
                        <button type="button" className="fm-edit-link" onClick={() => openEdit(b)}>
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                  {upcomingFor(detail.id).length === 0 ? <p className="fm-none">No upcoming bookings.</p> : null}
                </div>
              </div>

              <div className="fm-stack-18">
                <div className="fm-panel-sm">
                  <div className="ad-section fm-gap-6">Holds</div>
                  <p className="fm-panel-note">A vendor on hold can't make new reservations.</p>
                  <div className="fm-stack-8 fm-gap-12">
                    {detail.holds.map((h) => (
                      <div key={h.id} className="fm-hold">
                        <div>
                          <div className="fm-hold__reason">{h.reason}</div>
                          <div className="fm-hold__date">Placed {fmtMoment(h.placedAt)}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setConfirm({
                              title: 'Release this hold?',
                              body: `${detail.business} will be able to make new reservations again. Hold reason: ${h.reason}`,
                              keepLabel: 'Keep hold',
                              confirmLabel: 'Yes, release hold',
                              danger: false,
                              run: () => act(() => releaseHold({ data: { holdId: h.id } })),
                            })
                          }
                        >
                          Release
                        </button>
                      </div>
                    ))}
                  </div>
                  <form
                    className="fm-holdform"
                    onSubmit={(e) => {
                      e.preventDefault()
                      const reason = holdDraft.trim()
                      if (!reason) return
                      void act(() => placeHold({ data: { vendorId: detail.id, reason } })).then(() => setHoldDraft(''))
                    }}
                  >
                    <input className="kb-input" aria-label="Hold reason" placeholder="Reason for hold" value={holdDraft} onChange={(e) => setHoldDraft(e.currentTarget.value)} />
                    <button type="submit">Place hold</button>
                  </form>
                </div>
                <div className="fm-panel-sm">
                  <div className="ad-section fm-gap-6">Cancellations</div>
                  <p className="fm-panel-note">Removing one is a manual exception to the cancellation rules.</p>
                  <div className="fm-stack-8">
                    {detail.cancellations.map((c) => (
                      <div key={c.id} className="fm-cancelrow">
                        <span>
                          {fmtMoment(c.at)}
                          {c.late ? ' · under 72 hours' : ' · with notice'}
                        </span>
                        <button type="button" className="fm-edit-link fm-edit-link--sm" onClick={() => act(() => removeCancellation({ data: { cancellationId: c.id } }))}>
                          Remove
                        </button>
                      </div>
                    ))}
                    {detail.cancellations.length === 0 ? <p className="fm-none">None on record.</p> : null}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}

        {tab === 'bookings' ? (
          <>
            <div className="fm-toolbar fm-toolbar--split">
              <div className="fm-datepick">
                <button type="button" aria-label="Previous Saturday" disabled={dateIdx <= 0} className="ad-arrow" onClick={() => go({ date: data.dates[dateIdx - 1] })}>
                  ‹
                </button>
                <select className="kb-input fm-dateselect" aria-label="Market date" value={adminDate} onChange={(e) => go({ date: e.currentTarget.value })}>
                  {data.dates.map((d) => (
                    <option key={d} value={d}>
                      {fmtDayYear(d)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label="Next Saturday"
                  disabled={dateIdx >= data.dates.length - 1}
                  className="ad-arrow"
                  onClick={() => go({ date: data.dates[dateIdx + 1] })}
                >
                  ›
                </button>
              </div>
              <div className="fm-toolbar__end">
                <div className="fm-tabs">
                  {(['all', 'booked', 'open', 'closed'] as const).map((f) => (
                    <button key={f} type="button" className={stallFilter === f ? 'fm-tab is-active' : 'fm-tab'} onClick={() => setStallFilter(f)}>
                      {f[0]!.toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
                <button type="button" className="fm-btn-approve" onClick={() => openNew({})}>
                  New booking
                </button>
              </div>
            </div>
            <div className="fm-tablecard">
              <div className="ad-table fm-minw-1040">
                <div className="ad-srow fm-thead">
                  <div>STALL</div>
                  <div>BOOKED BY</div>
                  <div>PLAN</div>
                  <div>ADD-ONS</div>
                  <div>AMOUNT</div>
                  <div>PAYMENT</div>
                  <div>ACTIONS</div>
                </div>
                {stallRows
                  .filter((r) => stallFilter === 'all' || r.state === stallFilter)
                  .map(({ stall, booking, closed }) => (
                    <div key={stall.id} className="ad-srow fm-srow">
                      <div>
                        <div className="fm-bold">{stall.label}</div>
                        <div className="fm-cell-xs">Zone {stall.zone}</div>
                      </div>
                      <div>
                        <div className="fm-semibold">{booking ? vendorName(booking) : closed ? 'Closed' : 'Open'}</div>
                        <div className="fm-cell-xs">{booking ? `${booking.source} booking${booking.note ? ` · ${booking.note}` : ''}` : ''}</div>
                      </div>
                      <div>{booking ? planText(booking.plan) : ''}</div>
                      <div className="fm-cell-addons">{booking ? addonText(booking) : ''}</div>
                      <div>{booking ? `$${booking.amount}` : ''}</div>
                      <div>{booking ? <Pill look={PAY_LOOK[booking.payment]} /> : null}</div>
                      <div className="fm-rowactions">
                        {booking ? (
                          <button type="button" className="ad-link" onClick={() => openEdit(booking)}>
                            Edit
                          </button>
                        ) : closed ? (
                          <button type="button" className="ad-link" onClick={() => act(() => setStallClosed({ data: { date: adminDate, stallId: stall.id, closed: false } }))}>
                            Reopen
                          </button>
                        ) : (
                          <>
                            <button type="button" className="ad-link" onClick={() => openNew({ date: adminDate, stallId: stall.id })}>
                              Add booking
                            </button>
                            <button
                              type="button"
                              className="ad-link ad-link--danger"
                              onClick={() => act(() => setStallClosed({ data: { date: adminDate, stallId: stall.id, closed: true } }))}
                            >
                              Close
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </>
        ) : null}

        {tab === 'pricing' ? (
          <>
            <div className="ad-split">
              <div className="fm-panel-price">
                <div className="ad-section fm-gap-6">Stall prices</div>
                <p className="fm-panel-note fm-gap-18">Per Saturday, by plan.</p>
                <div className="fm-pricegrid">
                  <div className="ad-label">STALLS</div>
                  <div className="ad-label">WEEKLY</div>
                  <div className="ad-label">SEASONAL</div>
                  <div className="fm-price-name">Every stall</div>
                  <MoneyInput label="Every stall weekly price" field="weekly" initial={data.prices.weekly} onSaved={refresh} />
                  <MoneyInput label="Every stall seasonal price" field="seasonal" initial={data.prices.seasonal} onSaved={refresh} />
                </div>
              </div>
              <div className="fm-panel-price">
                <div className="ad-section fm-gap-6">Add-ons</div>
                <p className="fm-panel-note fm-gap-18">Per Saturday. Leave electricity blank to show "TBC" to vendors.</p>
                <div className="fm-pricegrid">
                  <div className="ad-label">ADD-ON</div>
                  <div className="ad-label">PRICE</div>
                  <div className="ad-label">AVAILABLE</div>
                  <div className="fm-price-name">Tent</div>
                  <MoneyInput label="Tent price" field="tent" initial={data.prices.tent} onSaved={refresh} />
                  <div className="fm-price-nolimit">No limit</div>
                  <div className="fm-price-name">Tables</div>
                  <MoneyInput label="Table price" field="table" initial={data.prices.table} onSaved={refresh} />
                  <MoneyInput plain label="Tables available" field="stockTables" initial={String(data.stock.tables)} onSaved={refresh} />
                  <div className="fm-price-name">Electricity</div>
                  <MoneyInput label="Electricity price" field="electricity" placeholder="TBC" initial={data.prices.electricity} onSaved={refresh} />
                  <MoneyInput plain label="Electricity hookups available" field="stockElectricity" initial={String(data.stock.electricity)} onSaved={refresh} />
                </div>
              </div>
            </div>
            <p className="fm-viewonly">Changes apply to new reservations and the public page right away. Existing bookings keep their agreed price.</p>
          </>
        ) : null}
      </div>

      {editor ? (
        <BookingEditor
          data={data}
          editor={editor}
          setEditor={setEditor}
          onSaved={(date) => {
            void refresh()
            if (tab === 'bookings') void go({ date })
          }}
        />
      ) : null}
      {approving ? <ApproveDialog vendor={approving} onClose={() => setApproving(null)} onSaved={refresh} /> : null}
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </main>
  )
}

