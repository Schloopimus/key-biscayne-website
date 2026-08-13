import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { SectionHeading, SiteFooter } from '../components/SitePieces'
import { SiteHeader } from '../components/SiteHeader'
import { vendors } from '../site-data'

const processSteps = [
  {
    title: 'Create an account',
    copy: 'Set up your vendor account and apply with your business details and health-department certification.',
  },
  {
    title: 'Get approved',
    copy: 'Our market team reviews every application, usually within a few business days.',
  },
  {
    title: 'Book a stall',
    copy: 'From your dashboard, pick your spot on the plaza map and reserve it for market day.',
  },
] as const

export const Route = createFileRoute('/farmers-market')({
  head: () => ({
    meta: [
      { title: 'Farmers Market | Key Biscayne Community Church' },
      {
        name: 'description',
        content: 'Meet local vendors every Saturday at the Key Biscayne Farmers Market.',
      },
    ],
  }),
  component: FarmersMarketPage,
})

function FarmersMarketPage() {
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null)

  return (
    <div className="page-shell market-page">
      <SiteHeader active="/farmers-market" surface="green" />
      <main id="main-content" className="snap-page">
        <section id="market-intro" className="page-section market-hero" data-header-surface="green">
          <div className="split-layout split-layout--hero">
            <div>
              <p className="eyebrow">Every Saturday · 9 AM–12 PM</p>
              <h1>Heart of the Key Farmers Market</h1>
              <p className="lead">
                The Key Biscayne Farmers Market is the island’s Saturday tradition. On the grounds
                of the Community Church, residents, families, and local vendors meet in a relaxed,
                welcoming atmosphere that feels like classic Key Biscayne.
              </p>
              <div className="button-row">
                <a className="button button--gold" href="/farmers-market/vendor/sign-up">
                  Book a stall <span aria-hidden="true">→</span>
                </a>
                <a className="button button--ghost" href="/farmers-market/vendor/login">
                  Log in
                </a>
              </div>
            </div>
            <figure className="portrait-card portrait-card--market">
              <img src="/images/market-hero.png" alt="Fresh produce at the Key Biscayne Farmers Market" />
              <figcaption>Farmers Market</figcaption>
            </figure>
          </div>
        </section>

        <section
          id="vendor-process"
          className="page-section market-process-section"
          data-header-surface="green-pale"
        >
          <SectionHeading eyebrow="For vendors" title="Sell your goods on the plaza" />
          <ol className="process-grid">
            {processSteps.map((step, index) => (
              <li key={step.title}>
                <span>Step {index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </li>
            ))}
          </ol>
          <a className="button button--market-dark" href="/farmers-market/vendor/sign-up">
            Book a stall <span aria-hidden="true">→</span>
          </a>
        </section>

        <section
          id="market-vendors"
          className="page-section market-vendors-section"
          data-header-surface="green-pale"
        >
          <SectionHeading eyebrow="Meet our vendors" title="A few market favorites" />
          <div className="vendor-grid">
            {vendors.map((vendor) => {
              const expanded = expandedVendor === vendor.name
              return (
                <article
                  key={vendor.name}
                  className={`vendor-card${expanded ? ' is-expanded' : ''}`}
                >
                  <button
                    className="vendor-card__trigger"
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setExpandedVendor(expanded ? null : vendor.name)}
                  >
                    <img src={vendor.image} alt={`${vendor.name} market stall`} />
                    <span className="vendor-card__copy">
                      <span className="eyebrow">{vendor.category}</span>
                      <strong>{vendor.name}</strong>
                      <span className="vendor-card__more">{expanded ? 'Read less −' : 'Read more +'}</span>
                    </span>
                  </button>
                  {expanded ? (
                    <div className="vendor-card__details">
                      <p className="eyebrow">Vendor details</p>
                      <h3>{vendor.name}</h3>
                      <dl>
                        <div><dt>Category</dt><dd>{vendor.category}</dd></div>
                        <div><dt>When</dt><dd>Saturdays · 9 AM–12 PM</dd></div>
                        <div><dt>Where</dt><dd>Key Biscayne Community Church plaza</dd></div>
                      </dl>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
          <SiteFooter />
        </section>
      </main>
    </div>
  )
}
