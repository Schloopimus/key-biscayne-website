import { createFileRoute } from '@tanstack/react-router'
import { ScrollCue } from '../components/ScrollSections'
import { SchoolInterestForm } from '../components/StaticForms'
import { SectionHeading, SiteFooter } from '../components/SitePieces'
import { SiteHeader } from '../components/SiteHeader'


const objectives = [
  'Self-help skills',
  'Visual processing',
  'Gross & fine motor coordination',
  'Auditory processing',
  'Expressive & receptive language',
]

const classActivities = [
  'Fun with music',
  'Creative movement',
  'Art',
  'Science & sensory activities',
  'Language arts & Spanish',
  'Social skills',
  'Computers',
]

const enrichment = [
  'Boys & Girls Soccer',
  'Ballet',
  'JuJitsu',
  'Ceramics',
  'Gymnastics',
  'Music & Zumba',
  'Tennis',
  'Golf',
  'Crayola Model Animal Art',
  'Portuguese',
]

export const Route = createFileRoute('/community-school')({
  head: () => ({
    meta: [
      { title: 'Community School | Key Biscayne Community Church' },
      {
        name: 'description',
        content: 'Day School, after-school enrichment, and summer camp on Key Biscayne.',
      },
    ],
  }),
  component: CommunitySchoolPage,
})

function CommunitySchoolPage() {
  return (
    <div className="page-shell school-page">
      <SiteHeader active="/community-school" surface="school" />
      <main id="main-content" className="snap-page">
        <section id="school-intro" className="page-section school-hero" data-header-surface="school">
          <div className="split-layout split-layout--hero">
            <div>
              <p className="eyebrow">Your little one will flourish at</p>
              <h1>Your little one will flourish here</h1>
              <p className="lead">
                KBCC Day School keeps each class within a small age interval, allowing optimal
                growth and meaningful developmental differentiation. Our written curriculum is
                rooted in a true hands-on learning system.
              </p>
              <a className="button button--primary" href="#register">
                Register interest <span aria-hidden="true">→</span>
              </a>
            </div>
            <figure className="portrait-card">
              <img src="/images/school-day.png" alt="A child learning through play at KBCC Day School" />
              <figcaption>KBCC Day School</figcaption>
            </figure>
          </div>
          <ScrollCue target="day-school" />
        </section>

        <section id="day-school" className="page-section section-blue-mist" data-header-surface="mist">
          <SectionHeading
            eyebrow="Ages 2–5"
            title="KBCC Day School"
            body="A true hands-on learning system, with classes small enough for every child to be known."
          />
          <div className="school-grid">
            <article className="content-card content-card--wide">
              <p className="eyebrow">Developmental objectives covered</p>
              <div className="tag-list">
                {objectives.map((objective) => (
                  <span key={objective}>{objective}</span>
                ))}
              </div>
              <p>Plus basic cognitive skills: reading readiness, mathematics, and language arts.</p>
            </article>
            <article className="feature-card feature-card--blue">
              <div>
                <h3>Small class sizes</h3>
                <p>Personalized learning and attention</p>
              </div>
              <div>
                <h3>Bilingual programme</h3>
                <p>Multilingual teachers in every class</p>
              </div>
              <div>
                <h3>Faith & joy</h3>
                <p>A safe, joyful, community-focused day</p>
              </div>
            </article>
            <article className="content-card content-card--full">
              <p className="eyebrow">All classes include</p>
              <div className="tag-list tag-list--dense">
                {classActivities.map((activity) => (
                  <span key={activity}>{activity}</span>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section id="after-school" className="page-section school-dark-section" data-header-surface="navy">
          <SectionHeading
            inverse
            eyebrow="Toddlers through elementary · open to the community"
            title="After-School Enrichment"
          />
          <div className="after-school-grid">
            <div className="care-times">
              <article>
                <div>
                  <h3>After Care</h3>
                  <p>Registration required</p>
                </div>
                <time>2:30–5:30 PM</time>
              </article>
              <article>
                <div>
                  <h3>Early drop-off</h3>
                  <p>Before school</p>
                </div>
                <time>7:30–8:30 AM</time>
              </article>
              <p>
                An hourly or monthly fee applies. Your child does not need to be enrolled in Day
                School—After Care is open to the whole island.
              </p>
            </div>
            <article className="enrichment-card">
              <h3>Enrichment programmes offered</h3>
              <div className="tag-list tag-list--dark">
                {enrichment.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section id="summer-camp" className="page-section section-blue-mist" data-header-surface="mist">
          <SectionHeading eyebrow="Summer on the island" title="Summer Camp" />
          <div className="summer-grid">
            <figure className="landscape-image landscape-image--summer">
              <img src="/images/school-summer.png" alt="Children enjoying outdoor summer activities" />
              <figcaption>Summer on the island</figcaption>
            </figure>
            <div className="summer-copy">
              <p className="lead">
                A joyful, faith-filled summer full of water play, crafts, and outdoor adventure—the
                same small-class care and warmth of our school year, all summer long.
              </p>
              <div className="summer-features">
                <article><h3>Water play</h3><p>Splash days every week</p></article>
                <article><h3>Crafts</h3><p>Hands-on art and making</p></article>
                <article><h3>Field trips</h3><p>Adventures off campus</p></article>
                <article><h3>Themed weeks</h3><p>Half- or full-day options</p></article>
              </div>
              <p>
                This year’s themes and exact dates are being finalized. Register your interest and
                we’ll follow up.
              </p>
            </div>
          </div>
        </section>

        <section id="register" className="page-section school-register-section" data-header-surface="navy">
          <SectionHeading inverse eyebrow="Register your child" title="Registration interest form" />
          <SchoolInterestForm />
          <SiteFooter inverse />
        </section>
      </main>
    </div>
  )
}
