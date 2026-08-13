import { createFileRoute } from '@tanstack/react-router'
import { ImageAlbum } from '../components/ImageAlbum'
import { ScrollCue } from '../components/ScrollSections'
import { ScheduleList, SectionHeading, SiteFooter } from '../components/SitePieces'
import { SiteHeader } from '../components/SiteHeader'
import { homeEvents } from '../site-data'


export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Key Biscayne Community Church & Day School' },
      {
        name: 'description',
        content: 'Worship, grow, and serve with a sacred community on Key Biscayne.',
      },
    ],
  }),
  component: HomePage,
})

function HomePage() {
  return (
    <div className="page-shell">
      <SiteHeader surface="image" />
      <main id="main-content" className="snap-page">
        <section id="welcome" className="page-section home-hero" data-header-surface="image">
          <img className="home-hero__image" src="/images/church-hero.png" alt="Key Biscayne Community Church congregation" />
          <div className="home-hero__shade" />
          <div className="glass-hero">
            <p className="eyebrow eyebrow--gold">The Key Biscayne Church welcomes you…</p>
            <h1>We’re building a sacred community</h1>
            <p>
              On the shores of Key Biscayne, we gather to worship, to grow, and to serve our
              neighbours. Whether you’re visiting for a Sunday, dropping your child at school, or
              shopping the Saturday market, there’s a place for you here.
            </p>
            <div className="button-row">
              <a className="button button--gold" href="/about#schedule">
                Join us Sunday <span aria-hidden="true">→</span>
              </a>
              <a className="button button--ghost" href="#our-mission">
                Explore the church
              </a>
            </div>
          </div>
          <ScrollCue target="our-mission" inverse />
        </section>

        <section id="our-mission" className="page-section section-cream" data-header-surface="cream">
          <div className="split-layout split-layout--mission">
            <div>
              <SectionHeading
                eyebrow="Our mission"
                title="To lead, teach and help people to have a personal relationship with Christ and share his good news!"
              />
              <div className="pillar-list">
                <article>
                  <h3>Worship</h3>
                  <p>Sunday services, sacred music, and a choir that lifts the whole island.</p>
                </article>
                <article>
                  <h3>Nurture</h3>
                  <p>A day school, after-school enrichment, and summer camp for our youngest.</p>
                </article>
                <article>
                  <h3>Serve</h3>
                  <p>Outreach ministry and a weekly farmers market that feeds the community.</p>
                </article>
              </div>
            </div>
            <ImageAlbum
              images={[
                {
                  src: '/images/church-hero.png',
                  label: 'Our mission',
                  alt: 'The Key Biscayne church community gathered together',
                },
                {
                  src: '/images/church-sanctuary.png',
                  label: 'Inside our sanctuary',
                  alt: 'Inside the Key Biscayne Community Church sanctuary',
                },
                {
                  src: '/images/church-glenridge.png',
                  label: 'Our church on Glenridge Road',
                  alt: 'Key Biscayne Community Church exterior on Glenridge Road',
                },
              ]}
            />
          </div>
        </section>

        <section id="belong" className="page-section section-blue-mist" data-header-surface="mist">
          <SectionHeading eyebrow="Come & belong" title="Three ways to be part of it" body="Choose a card to step inside." />
          <div className="belong-grid">
            <a className="belong-card belong-card--market" href="/farmers-market">
              <span className="eyebrow">Every Saturday</span>
              <h3>Farmers Market</h3>
              <p>
                The island’s Saturday tradition, bringing together residents, families, and local
                vendors on the church plaza.
              </p>
              <strong>Step inside →</strong>
            </a>
            <a className="belong-card belong-card--school" href="/community-school">
              <span className="eyebrow">School, daycare & summer camp</span>
              <h3>Children’s School</h3>
              <p>
                Day school, after-school enrichment, and a joyful summer camp where every child is
                known and loved.
              </p>
              <strong>Step inside →</strong>
            </a>
            <a className="belong-card belong-card--outreach" href="/mission">
              <span className="eyebrow">Service</span>
              <h3>Outreach Ministry</h3>
              <p>
                Food drives, simple donations, and volunteer opportunities that carry love beyond
                our walls.
              </p>
              <strong>Step inside →</strong>
            </a>
          </div>
        </section>

        <section
          id="events"
          className="page-section section-cream home-events-section"
          data-header-surface="cream"
        >
          <header className="event-heading">
            <p className="eyebrow">What’s happening</p>
            <div className="event-heading__row">
              <h2>Coming up on the island</h2>
              <a className="event-heading__link" href="/about#calendar">
                View all events
              </a>
            </div>
          </header>
          <div className="event-grid">
            {homeEvents.map((event) => (
              <article key={event.title} className={`event-card tone-${event.tone}`}>
                <div className="event-card__art">
                  <time>
                    <strong>{event.day}</strong>
                    <span>{event.month}</span>
                  </time>
                </div>
                <div className="event-card__copy">
                  <p className="eyebrow">{event.category}</p>
                  <h3>{event.title}</h3>
                  <p>{event.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="weekly-rhythm" className="page-section invitation-section" data-header-surface="navy">
          <div className="invitation-grid">
            <div className="invitation-copy">
              <p className="eyebrow eyebrow--gold">Join us this Sunday</p>
              <h2>Find your rhythm here</h2>
              <p>
                Simple ways to plug in each week, whether you’re just exploring or already part of
                the community.
              </p>
              <a className="button button--gold" href="/about#contact">
                Get in touch <span aria-hidden="true">→</span>
              </a>
            </div>
            <ScheduleList compact />
          </div>
          <SiteFooter inverse />
        </section>
      </main>
    </div>
  )
}
