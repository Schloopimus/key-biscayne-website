import { createFileRoute } from '@tanstack/react-router'
import { ScrollCue, SectionNav } from '../components/ScrollSections'
import { SectionHeading, SiteFooter } from '../components/SitePieces'
import { SiteHeader } from '../components/SiteHeader'
import { vendors } from '../site-data'

const sections = [
  { id: 'market-intro', label: 'Farmers Market' },
  { id: 'vendor-process', label: 'Vendor process' },
  { id: 'market-vendors', label: 'Our vendors' },
] as const

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

  return (
    <div className="page-shell market-page">
      <SiteHeader active="/farmers-market" inverse />
      <SectionNav sections={sections} />
      <main id="main-content" className="snap-page">
        <section id="market-intro" className="page-section market-hero">
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
                <a className="button button--market" href="/farmers-market/vendor/application">
                  Apply as a vendor <span aria-hidden="true">→</span>
                </a>
                <a className="button button--ghost" href="/farmers-market/vendor">
                  Vendor portal
                </a>
              </div>
            </div>
            <figure className="portrait-card portrait-card--market">
              <img src="/images/market-hero.png" alt="Fresh produce at the Key Biscayne Farmers Market" />
              <figcaption>Farmers Market</figcaption>
            </figure>
          </div>
          <ScrollCue target="vendor-process" inverse />
        </section>

        <section id="vendor-process" className="page-section market-process-section">
          <SectionHeading eyebrow="For vendors" title="Sell your goods on the plaza" />
          <ol className="process-grid">
            {processSteps.map((step, index) => (
              <li key={step.title}>
                <span>0{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </li>
            ))}
          </ol>
          <a className="button button--market-dark" href="/farmers-market/vendor/application">
            Start vendor application <span aria-hidden="true">→</span>
          </a>
        </section>

        <section id="market-vendors" className="page-section market-vendors-section">
          <SectionHeading eyebrow="Meet our vendors" title="A few market favorites" />
          <div className="vendor-grid">
            {vendors.map((vendor) => (
              <article key={vendor.name} className="vendor-card">
                <img src={vendor.image} alt={`${vendor.name} market stall`} />
                <div>
                  <p className="eyebrow">{vendor.category}</p>
                  <h3>{vendor.name}</h3>
                </div>
              </article>
            ))}
          </div>
          <SiteFooter />
        </section>
      </main>
    </div>
  )
}
