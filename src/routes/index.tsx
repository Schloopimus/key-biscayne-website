import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { MarketShell, SIGNUP_STORAGE_KEY, errorMessage, scrollToSection } from '../components/market/MarketShell'
import { CategorySelect } from '../components/market/CategorySelect'
import { MARKET_CATEGORIES, TICKER_ITEMS, VENDOR_LOGOS, num } from '../market/rules'
import { getPublicMarket, signUpVendor } from '../server/market-vendor.functions'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'The Key Biscayne Farmers Market' },
      {
        name: 'description',
        content: 'Local growers, bakers, and makers on the Key Biscayne Community Church plaza every Saturday, 9AM – 12PM.',
      },
    ],
  }),
  loader: () => getPublicMarket(),
  component: FarmersMarketPage,
})

const emptySignup = { firstName: '', lastName: '', business: '', email: '', phone: '', category: '', notes: '' }

function SignupForm() {
  const navigate = useNavigate()
  const [form, setForm] = useState(emptySignup)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const field = (key: keyof typeof emptySignup) => ({
    value: form[key],
    onChange: (event: { currentTarget: { value: string } }) => {
      const value = event.currentTarget.value
      setForm((current) => ({ ...current, [key]: value }))
      setError('')
    },
  })

  async function submit(event: { preventDefault(): void }) {
    event.preventDefault()
    const missing = (
      [
        ['firstName', 'first name'],
        ['lastName', 'last name'],
        ['business', 'business or farm name'],
        ['email', 'email'],
        ['phone', 'telephone'],
        ['category', 'category'],
      ] as const
    )
      .filter(([k]) => !form[k].trim())
      .map(([, label]) => label)
    if (missing.length) return setError(`Please add your ${missing.join(', ')}.`)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError('Please enter a valid email address.')
    setBusy(true)
    try {
      const result = await signUpVendor({ data: form })
      try {
        window.sessionStorage.setItem(SIGNUP_STORAGE_KEY, JSON.stringify(result))
      } catch {
        // Without storage the next screen still explains what to do.
      }
      await navigate({ to: '/check-email' })
    } catch (caught) {
      setError(errorMessage(caught))
      setBusy(false)
    }
  }

  return (
    <form className="fm-signup" onSubmit={submit} noValidate>
      <div className="mk-formrow">
        <label className="mk-field">
          First name
          <input className="kb-input-dark" autoComplete="given-name" {...field('firstName')} />
        </label>
        <label className="mk-field">
          Last name
          <input className="kb-input-dark" autoComplete="family-name" {...field('lastName')} />
        </label>
      </div>
      <label className="mk-field">
        Business or farm name
        <input className="kb-input-dark" autoComplete="organization" {...field('business')} />
      </label>
      <div className="mk-formrow">
        <label className="mk-field">
          Email
          <input className="kb-input-dark" type="email" autoComplete="email" placeholder="you@business.com" {...field('email')} />
        </label>
        <label className="mk-field">
          Telephone
          <input className="kb-input-dark" type="tel" autoComplete="tel" placeholder="(305) 000-0000" {...field('phone')} />
        </label>
      </div>
      <label className="mk-field">
        Category
        <CategorySelect className="kb-input-dark" {...field('category')} />
      </label>
      <label className="mk-field">
        Other notes (optional)
        <textarea className="kb-input-dark fm-noresize" rows={3} placeholder="Anything you'd like us to know" {...field('notes')} />
      </label>
      {error ? (
        <p role="alert" className="fm-alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className="fm-signup__submit" disabled={busy}>
        Join the farmers market →
      </button>
      <p className="fm-signup__foot">We'll email you a link to set your password.</p>
    </form>
  )
}

function FarmersMarketPage() {
  const { prices, session } = Route.useLoaderData()
  const seasonal = num(prices.seasonal)
  const weekly = num(prices.weekly)
  const ticker = [...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS]

  // The page scrolls inside its own container, so links such as /#market-apply are aligned here.
  useEffect(() => {
    const id = window.location.hash.slice(1)
    if (id) document.getElementById(decodeURIComponent(id))?.scrollIntoView({ block: 'start' })
  }, [])

  return (
    <MarketShell surface="info" session={session}>
      <main id="main-content" className="kb-scroller">
        <section id="market-top" className="fm-hero">
          <div className="mk-wrap mk-hero">
            <div>
              <div className="mk-eyebrow fm-hero__eyebrow">EVERY SATURDAY · 9AM – 12PM</div>
              <h1 className="fm-hero__title">The Key Biscayne Farmers Market</h1>
              <p className="fm-hero__lede">
                Local growers, bakers, and makers gather on the church plaza every Saturday morning — fresh produce, flowers, coffee, and live music under
                the palms.
              </p>
              <div className="fm-hero__actions">
                <button type="button" className="fm-btn-gold" onClick={() => scrollToSection('market-apply')}>
                  Apply as a Vendor →
                </button>
                <a className="fm-btn-ghost" href={session ? '/vendor' : '/vendor/login'}>
                  {session ? 'My dashboard' : 'Vendor login'}
                </a>
              </div>
            </div>
            <div className="fm-hero__photo">
              <img src="/images/church-daytime-exterior.jpg" alt="The Key Biscayne Community Church plaza" />
              <div className="fm-hero__shade" />
              <div className="fm-hero__caption">MARKET DAY ON THE PLAZA</div>
            </div>
          </div>
        </section>

        <div className="fm-ticker" aria-hidden="true">
          <div className="mk-ticker">
            {ticker.map((item, i) => (
              <span key={i}>{item}  ✦</span>
            ))}
          </div>
        </div>

        <div className="fm-facts">
          <div className="mk-wrap mk-g4 mk-facts">
            <div>
              <div className="mk-stat">22</div>
              <div className="mk-statlabel">VENDOR BRANDS</div>
            </div>
            <div>
              <div className="mk-stat">Saturdays</div>
              <div className="mk-statlabel">EVERY WEEK</div>
            </div>
            <div>
              <div className="mk-stat">9 – 12</div>
              <div className="mk-statlabel">MARKET HOURS</div>
            </div>
            <div>
              <div className="mk-stat">${seasonal}</div>
              <div className="mk-statlabel">SEASONAL, PER SATURDAY</div>
            </div>
          </div>
        </div>

        <section id="market-story" className="mk-sec fm-bg-mint">
          <div className="mk-wrap mk-g2">
            <div className="fm-story__photos">
              <img className="fm-story__wide" src="/images/church-sunset-exterior.jpg" alt="Key Biscayne Community Church at sunset" />
              <div className="mk-slot fm-ratio-43">
                <span className="mk-slotlabel">PHOTO NEEDED</span>
                <span>Vendors on the plaza</span>
              </div>
              <div className="mk-slot fm-ratio-43">
                <span className="mk-slotlabel">PHOTO NEEDED</span>
                <span>Saturday crowd</span>
              </div>
            </div>
            <div>
              <div className="mk-eyebrow fm-gap-16">OUR STORY</div>
              <h2 className="mk-h2 fm-gap-24">Where the island gathers on Saturday</h2>
              <p className="mk-body">
                Every Saturday morning, the plaza at Key Biscayne Community Church fills with local growers, bakers, and makers. Neighbors come for fresh
                produce, flowers, and coffee, and stay for the live music under the palms.
              </p>
              <p className="mk-body fm-gap-26">
                It's a simple idea: give small local businesses a welcoming place to sell, and give the island a reason to slow down together.
              </p>
              <div className="fm-pills">
                <span className="mk-pill">Every Saturday</span>
                <span className="mk-pill">On the church plaza</span>
                <span className="mk-pill">Local growers &amp; makers</span>
                <span className="mk-pill">Live music</span>
              </div>
            </div>
          </div>
        </section>

        <section id="market-find" className="mk-sec fm-bg-pale">
          <div className="mk-wrap">
            <div className="mk-eyebrow fm-gap-16">WHAT YOU'LL FIND</div>
            <h2 className="mk-h2 fm-gap-40">From the farm, the oven, and the workshop</h2>
            <div className="mk-g3">
              {MARKET_CATEGORIES.map((category) => (
                <div key={category} className="mk-slot fm-ratio-43">
                  <span className="mk-slotlabel">PHOTO NEEDED</span>
                  <span className="fm-slot-title">{category}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="market-vendors" className="mk-sec fm-bg-white">
          <div className="mk-wrap">
            <div className="mk-eyebrow fm-gap-16">MEET OUR VENDORS</div>
            <h2 className="mk-h2 fm-gap-40">The brands behind the booths</h2>
            <div className="mk-logos">
              {VENDOR_LOGOS.map((vendor) => (
                <div key={vendor.name} className="fm-logo-tile" style={{ background: vendor.bg }}>
                  {vendor.image ? <img src={vendor.image} alt={`${vendor.name} logo`} loading="lazy" /> : <span>{vendor.name}</span>}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="market-booking" className="mk-sec fm-bg-mint">
          <div className="mk-wrap">
            <div className="mk-eyebrow fm-gap-16">FOR VENDORS</div>
            <h2 className="mk-h2 fm-gap-40">Sell your goods on the plaza</h2>
            <div className="mk-g4 fm-gap-44">
              <div className="mk-card">
                <div className="mk-cardtitle">1. Join</div>
                <p className="mk-small">Sign up below in a minute, then finish your application with your documents.</p>
              </div>
              <div className="mk-card">
                <div className="mk-cardtitle">2. Get approved</div>
                <p className="mk-small">Our market team reviews every application. Only approved vendors can reserve a space.</p>
              </div>
              <div className="mk-card">
                <div className="mk-cardtitle">3. Reserve your booth</div>
                <p className="mk-small">Choose your plan and an open booth on the plaza map, then any add-ons. No payment is needed to reserve.</p>
              </div>
              <div className="mk-card">
                <div className="mk-cardtitle">4. Pay by Monday</div>
                <p className="mk-small">From your dashboard, pay for the next Saturday or several at once by Monday midnight.</p>
              </div>
            </div>

            <div className="mk-g2 fm-plans fm-gap-24">
              <div className="fm-plan fm-plan--dark">
                <div className="mk-eyebrow fm-plan__eyebrow">SEASONAL PLAN</div>
                <div className="fm-plan__price">
                  ${seasonal} <span>per Saturday</span>
                </div>
                <p>Booked in 3-month blocks and paid monthly.</p>
              </div>
              <div className="fm-plan">
                <div className="mk-eyebrow fm-plan__eyebrow">WEEKLY PLAN</div>
                <div className="fm-plan__price">
                  ${weekly} <span>per Saturday</span>
                </div>
                <p>Booked week by week.</p>
              </div>
            </div>

            <div className="mk-g2 fm-plans">
              <div className="mk-card">
                <div className="mk-cardtitle fm-gap-14">Optional add-ons</div>
                <ul className="mk-list">
                  <li>Tent — ${num(prices.tent)}</li>
                  <li>Tables — ${num(prices.table)}, limited availability</li>
                  <li>Electricity — limited availability</li>
                  <li>Other extras — limited availability</li>
                </ul>
              </div>
              <div className="mk-card">
                <div className="mk-cardtitle fm-gap-14">Market rules</div>
                <ul className="mk-list">
                  <li>Payment is due by Monday midnight. Unpaid spaces become available to anyone, and you can book another open space that week.</li>
                  <li>Cancellations require at least 72 hours' notice.</li>
                  <li>Two Saturdays cancelled without proper notice result in permanent loss of space.</li>
                  <li>Payments are non-refundable.</li>
                  <li>Exceptions require manual approval by the market team.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="market-visit" className="fm-visit">
          <div className="mk-wrap fm-visit__row">
            <div>
              <h2 className="mk-h2 fm-visit__title">Find us this Saturday</h2>
              <div className="fm-visit__address">355 Crandon Boulevard, Key Biscayne, FL 33149</div>
            </div>
            <div className="fm-visit__hours">
              <div>
                <div className="mk-stat">9AM</div>
                <div className="mk-statlabel">MARKET OPENS</div>
              </div>
              <div>
                <div className="mk-stat">12PM</div>
                <div className="mk-statlabel">MARKET CLOSES</div>
              </div>
            </div>
          </div>
        </section>

        <section id="market-apply" className="mk-sec fm-apply">
          <div className="mk-wrap mk-g2 fm-align-start">
            <div>
              <div className="mk-eyebrow fm-apply__eyebrow">VENDOR APPLICATION</div>
              <h2 className="mk-h2 fm-apply__title">Join the farmers market</h2>
              <p className="fm-apply__lede">
                It takes a minute. We'll email you a link to set your password. Then finish your application from your dashboard, and once you're approved,
                reserve a booth on the plaza map.
              </p>
              <a className="fm-apply__login" href="/vendor/login">
                Already a vendor? Log in
              </a>
            </div>
            <SignupForm />
          </div>
        </section>

        <footer className="fm-footer">
          <div className="mk-wrap fm-footer__row">
            <div>
              <div className="fm-footer__name">The Key Biscayne Farmers Market</div>
              <div>Every Saturday, 9AM – 12PM · 355 Crandon Boulevard, Key Biscayne, FL 33149</div>
            </div>
            <a className="fm-footer__admin" href="/admin/login">
              Market admin login
            </a>
          </div>
        </footer>
      </main>
    </MarketShell>
  )
}
