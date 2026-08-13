import { createFileRoute } from '@tanstack/react-router'
import { EventCalendar } from '../components/EventCalendar'
import { ScrollCue } from '../components/ScrollSections'
import { ContactForm } from '../components/StaticForms'
import { ScheduleList, SectionHeading, SiteFooter } from '../components/SitePieces'
import { SiteHeader } from '../components/SiteHeader'


export const Route = createFileRoute('/about')({
  head: () => ({
    meta: [
      { title: 'About | Key Biscayne Community Church' },
      {
        name: 'description',
        content: 'Find Key Biscayne Community Church, explore our weekly rhythm, and get in touch.',
      },
    ],
  }),
  component: AboutPage,
})

function AboutPage() {
  return (
    <div className="page-shell">
      <SiteHeader active="/about" surface="mist" />
      <main id="main-content" className="snap-page">
        <section id="about-intro" className="page-section about-intro section-blue-mist" data-header-surface="mist">
          <div className="quote-block">
            <p className="eyebrow">About our church</p>
            <h1>
              “For I know the plans I have for you,” says the Lord, “plans to prosper you and not
              to harm you, plans to give you hope and a future.”
            </h1>
            <cite>Jeremiah 29:11</cite>
            <p className="quote-block__body">
              We are about worshipping a God who has been so good to us. If you’re looking for
              religion and rules, this might not be the place—but if you’re seeking a Bible-loving,
              Jesus-celebrating church, welcome home.
            </p>
          </div>
          <ScrollCue target="find-us" />
        </section>

        <section id="find-us" className="page-section section-cream" data-header-surface="cream">
          <div className="location-grid">
            <div>
              <SectionHeading eyebrow="Find us" title="On the island, by the sea" />
              <div className="landscape-image">
                <img src="/images/church-location.png" alt="Key Biscayne Community Church exterior and grounds" />
              </div>
            </div>
            <div className="contact-cards">
              <a
                className="info-card"
                href="https://www.google.com/maps/search/?api=1&query=355+Glenridge+Rd+Key+Biscayne+FL+33149"
                target="_blank"
                rel="noreferrer"
              >
                <span className="eyebrow">Address</span>
                <strong>355 Glenridge Rd, Key Biscayne, FL 33149</strong>
                <small>Open in maps ↗</small>
              </a>
              <div className="info-card info-card--split">
                <div>
                  <span className="eyebrow">Call</span>
                  <strong>Office number to be confirmed</strong>
                </div>
                <div>
                  <span className="eyebrow">Email</span>
                  <strong>Church email to be confirmed</strong>
                </div>
              </div>
              <div className="info-card info-card--dark">
                <span className="eyebrow eyebrow--gold">Availability</span>
                <strong>Mon–Fri · 9:00 AM–4:00 PM</strong>
                <strong>Sunday · 9:00 AM–1:00 PM</strong>
              </div>
            </div>
          </div>
        </section>

        <section id="schedule" className="page-section section-blue-mist schedule-section" data-header-surface="mist">
          <SectionHeading
            eyebrow="What’s happening at KBCC"
            title="There’s always something happening at KBCC."
          />
          <ScheduleList />
          <p className="schedule-note">…and so much more throughout the month.</p>
          <a className="button button--primary" href="#calendar">
            See the full calendar <span aria-hidden="true">→</span>
          </a>
        </section>

        <section id="calendar" className="page-section section-cream" data-header-surface="cream">
          <SectionHeading eyebrow="Monthly snapshot" title="Events this month" />
          <EventCalendar />
        </section>

        <section id="contact" className="page-section contact-section" data-header-surface="navy">
          <div className="contact-layout">
            <div>
              <p className="eyebrow eyebrow--gold">Contact us</p>
              <h2>Ready to become a part of the community?</h2>
              <p>
                You can decide how you’d like to be involved. Our staff and community are here to
                support any path you choose. Thank you for reaching out.
              </p>
            </div>
            <ContactForm />
          </div>
          <SiteFooter inverse />
        </section>
      </main>
    </div>
  )
}
