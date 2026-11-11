import { createFileRoute, redirect, useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { CategorySelect } from '../components/market/CategorySelect'
import { errorMessage, signedIn } from '../components/market/MarketShell'
import { ACKS, PRICE_RANGES, ackKeys, docFields, isFoodCategory, stepErrors, vendorTypeLabel, type AckKey, type DocKind } from '../market/rules'
import { getVendorProfile, saveApplication, uploadDocument } from '../server/market-vendor.functions'

export const Route = createFileRoute('/vendor/application')({
  head: () => ({ meta: [{ title: 'Finish your application | Farmers Market' }] }),
  loader: async () => {
    const data = await signedIn(() => getVendorProfile(), 'vendor')
    if (data.me.status === 'pending' || data.me.status === 'approved') throw redirect({ to: '/vendor' })
    return data
  },
  component: ApplicationPage,
})

const TITLES = ['Tell us about your business', 'Upload your documents', 'Review and agree']
const STEP_LABELS = ['Business details', 'Documents', 'Agreements']

function ApplicationPage() {
  const { me } = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(!me.detailsDone ? 1 : !me.documentsDone ? 2 : 3)
  const [done, setDone] = useState({ details: me.detailsDone, documents: me.documentsDone })
  const [form, setForm] = useState({
    category: me.category,
    address: me.address,
    website: me.website,
    products: me.products,
    priceRange: me.priceRange,
    targetMarket: me.targetMarket,
    insuranceProvider: me.insuranceProvider,
    policyNumber: me.policyNumber,
  })
  const [docs, setDocs] = useState<Partial<Record<DocKind, string>>>(me.docs)
  const [uploading, setUploading] = useState<DocKind | null>(null)
  const [acks, setAcks] = useState<Array<AckKey>>(me.acks)
  const [errors, setErrors] = useState<Array<string>>([])
  const [showLiability, setShowLiability] = useState(false)
  const [busy, setBusy] = useState(false)

  const food = isFoodCategory(form.category)
  const set = (key: keyof typeof form) => (event: { currentTarget: { value: string } }) => {
    const value = event.currentTarget.value
    setForm((current) => ({ ...current, [key]: value }))
    setErrors([])
  }

  async function upload(kind: DocKind, file: File | undefined) {
    if (!file) return
    setUploading(kind)
    setErrors([])
    try {
      const body = new FormData()
      body.set('kind', kind)
      body.set('file', file)
      const result = await uploadDocument({ data: body })
      setDocs((current) => ({ ...current, [kind]: result.fileName }))
    } catch (caught) {
      setErrors([errorMessage(caught, 'That file could not be uploaded.')])
    } finally {
      setUploading(null)
    }
  }

  const payload = (advance: boolean) => ({ step, advance, ...form, acks })

  async function primary(event: { preventDefault(): void }) {
    event.preventDefault()
    const local = stepErrors(step, { ...form, docs, acks })
    if (local.length) return setErrors(local)
    setBusy(true)
    try {
      const result = await saveApplication({ data: payload(true) })
      if (result.errors.length) {
        setErrors(result.errors)
        return
      }
      if (step === 1) {
        setDone((d) => ({ ...d, details: true }))
        setStep(2)
      } else if (step === 2) {
        setDone((d) => ({ ...d, documents: true }))
        setStep(3)
      } else {
        await router.invalidate()
        await navigate({ to: '/vendor' })
      }
    } catch (caught) {
      setErrors([errorMessage(caught)])
    } finally {
      setBusy(false)
    }
  }

  async function saveLater() {
    setBusy(true)
    try {
      await saveApplication({ data: payload(false) })
      await navigate({ to: '/vendor' })
    } catch (caught) {
      setErrors([errorMessage(caught)])
      setBusy(false)
    }
  }

  const stepDone = [done.details, done.documents, false]

  return (
    <main id="main-content" className="fm-screen fm-screen--page fm-bg-mint">
      <div className="fm-wrap-780">
        <div className="mk-eyebrow fm-gap-12">FINISH YOUR APPLICATION</div>
        <h1 className="fm-title-48 fm-gap-26">{TITLES[step - 1]}</h1>
        <ol aria-label="Application steps" className="fm-appsteps">
          {STEP_LABELS.map((label, i) => {
            const cur = i + 1 === step
            const isDone = stepDone[i] && !cur
            return (
              <li key={label} aria-current={cur ? 'step' : undefined} className={cur ? 'is-current' : isDone ? 'is-done' : undefined}>
                <span aria-hidden="true">{isDone ? '✓' : i + 1}</span>
                {label}
              </li>
            )
          })}
        </ol>

        <form className="fm-appform" onSubmit={primary} noValidate>
          {step === 1 ? (
            <>
              <div className="mk-formrow">
                <label className="mk-field">
                  Category
                  <CategorySelect className="kb-input" value={form.category} onChange={set('category')} />
                </label>
                <div className="mk-field">
                  Vendor type<div className="fm-vendortype">{form.category ? vendorTypeLabel(form.category) : 'Choose a category first'}</div>
                </div>
              </div>
              <label className="mk-field">
                Business address
                <input className="kb-input" autoComplete="street-address" placeholder="Street, city, state, ZIP" value={form.address} onChange={set('address')} />
              </label>
              <label className="mk-field">
                Business website or social media (optional)
                <input className="kb-input" placeholder="www.yourbusiness.com or @yourbusiness" value={form.website} onChange={set('website')} />
              </label>
              <label className="mk-field">
                Merchandise or products to be sold
                <textarea className="kb-input fm-noresize" rows={3} placeholder="What will you sell at the market?" value={form.products} onChange={set('products')} />
              </label>
              <div className="mk-formrow">
                <label className="mk-field">
                  Price range (optional)
                  <select className="kb-input" value={form.priceRange} onChange={set('priceRange')}>
                    <option value="">Choose a range</option>
                    {PRICE_RANGES.map((range) => (
                      <option key={range}>{range}</option>
                    ))}
                  </select>
                </label>
                <label className="mk-field">
                  Target market or customer (optional)
                  <input className="kb-input" placeholder="e.g. families, home cooks" value={form.targetMarket} onChange={set('targetMarket')} />
                </label>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <p className="fm-formnote">PDF or image files. {food ? "As a food vendor, you'll also need your food handler's permit." : ''}</p>
              {docFields(form.category, !!form.website.trim()).map((d) => {
                const name = docs[d.kind]
                return (
                  <div key={d.kind}>
                    <div className="fm-doc__label">{d.required ? d.label : `${d.label} (optional)`}</div>
                    <div className="fm-doc__hint">{d.hint}</div>
                    <label className={name ? 'kb-file is-filled' : 'kb-file'}>
                      <span className="fm-anywhere">{uploading === d.kind ? 'Uploading…' : name || 'Click to upload a file'}</span>
                      <span className="fm-nowrap">{name ? 'Replace' : 'Upload'}</span>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        aria-label={d.label}
                        className="fm-file-input"
                        onChange={(event) => {
                          void upload(d.kind, event.currentTarget.files?.[0])
                          event.currentTarget.value = ''
                        }}
                      />
                    </label>
                  </div>
                )
              })}
              <div className="mk-formrow">
                <label className="mk-field">
                  Liability insurance provider
                  <input className="kb-input" value={form.insuranceProvider} onChange={set('insuranceProvider')} />
                </label>
                <label className="mk-field">
                  Policy number
                  <input className="kb-input" value={form.policyNumber} onChange={set('policyNumber')} />
                </label>
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <p className="fm-formnote">Please read each section and tick to agree. All are required.</p>
              {ackKeys(form.category).map((k) => {
                const checked = acks.includes(k)
                return (
                  <div key={k} className={checked ? 'fm-ack is-checked' : 'fm-ack'}>
                    <div className="fm-ack__title">{ACKS[k].title}</div>
                    <ul className="fm-ack__points">
                      {ACKS[k].points.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                    {k === 'liability' ? (
                      <>
                        <button type="button" className="ad-link fm-gap-12" aria-expanded={showLiability} onClick={() => setShowLiability((v) => !v)}>
                          {showLiability ? 'Hide the full clause' : 'Read the full Liability & Indemnification clause'}
                        </button>
                        {showLiability ? (
                          <div className="fm-clause">Placeholder: the full Liability &amp; Indemnification clause from the market's vendor agreement goes here.</div>
                        ) : null}
                      </>
                    ) : null}
                    <label className="fm-ack__agree">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          const on = event.currentTarget.checked
                          setAcks((current) => (on ? [...current.filter((x) => x !== k), k] : current.filter((x) => x !== k)))
                          setErrors([])
                        }}
                      />
                      I agree
                    </label>
                  </div>
                )
              })}
            </>
          ) : null}

          {errors.length ? (
            <div role="alert" className="fm-errors">
              <div className="fm-errors__title">Please fix the following:</div>
              <ul>
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="fm-appform__foot">
            <div className="fm-appform__left">
              {step > 1 ? (
                <button
                  type="button"
                  className="fm-btn-back"
                  onClick={() => {
                    setStep((s) => (s > 1 ? ((s - 1) as 1 | 2) : s))
                    setErrors([])
                  }}
                >
                  ← Back
                </button>
              ) : null}
              <button type="button" className="ad-link" onClick={saveLater} disabled={busy}>
                Save and finish later
              </button>
            </div>
            <button type="submit" className="fm-btn-submit" disabled={busy || !!uploading}>
              {step < 3 ? 'Save and continue →' : 'Submit application'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
