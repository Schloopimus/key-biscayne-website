import { createFileRoute } from '@tanstack/react-router'
import { ImageAlbum } from '../components/ImageAlbum'
import { ScrollCue, SectionNav } from '../components/ScrollSections'
import { VolunteerForm } from '../components/StaticForms'
import { SectionHeading, SiteFooter } from '../components/SitePieces'
import { SiteHeader } from '../components/SiteHeader'

const sections = [
  { id: 'mission-intro', label: 'Outreach ministries' },
  { id: 'involvement', label: 'Get involved' },
  { id: 'outreach', label: 'Community outreach' },
  { id: 'worship-team', label: 'Worship team' },
  { id: 'volunteer', label: 'Volunteer' },
] as const

const ministries = [
  {
    title: 'Worship Team',
    copy: 'If your gift includes music, we would love to hear it. Singers and instrumentalists can reach out to our Worship Director about an audition.',
    verse: '“Let everything that breathes sing praises to the Lord!” — Psalm 150:6',
  },
  {
    title: 'Youth Ministry',
    copy: 'Our Youth Ministry serves elementary, middle, and high-school students throughout the community through friendship, faith, and service.',
    verse: '“Be an example to all believers in what you say, in the way you live, in your love, your faith, and your purity.” — 1 Timothy 4:12',
  },
  {
    title: 'Community Bible Study',
    copy: 'Join us every Wednesday at 7:00 PM as we work through the Bible verse by verse in a way that is approachable and educational.',
    verse: 'Questions? Call the Bible Study team at (305) 586-3451.',
  },
] as const

export const Route = createFileRoute('/mission')({
  head: () => ({
    meta: [
      { title: 'Mission & Outreach | Key Biscayne Community Church' },
      {
        name: 'description',
        content: 'Serve through worship, youth ministry, Bible study, and community outreach.',
      },
    ],
  }),
  component: MissionPage,
})

function MissionPage() {
  return (
    <div className="page-shell mission-page">
      <SiteHeader active="/mission" />
      <SectionNav sections={sections} />
      <main id="main-content" className="snap-page">
        <section id="mission-intro" className="page-section mission-hero">
          <div className="split-layout split-layout--hero">
            <div>
              <p className="eyebrow">Outreach ministries</p>
              <h1>With one act of kindness at a time</h1>
              <p className="lead">
                We can make the world a better place for current and future generations. If you’d
                like to get involved in one of our ministries, there is a place for your gifts here.
              </p>
              <a className="button button--brown" href="#volunteer">
                Volunteer with us <span aria-hidden="true">→</span>
              </a>
            </div>
            <figure className="portrait-card portrait-card--warm">
              <img src="/images/outreach-director.png" alt="Eric Labrador, Outreach Director" />
              <figcaption>Eric Labrador, Outreach Director</figcaption>
            </figure>
          </div>
          <ScrollCue target="involvement" />
        </section>

        <section id="involvement" className="page-section mission-light-section">
          <SectionHeading eyebrow="Learn more about" title="Ministry involvement" />
          <div className="ministry-grid">
            {ministries.map((ministry, index) => (
              <article key={ministry.title} className="ministry-card">
                <span className="ministry-card__number">0{index + 1}</span>
                <h3>{ministry.title}</h3>
                <p>{ministry.copy}</p>
                <blockquote>{ministry.verse}</blockquote>
                <a href="#volunteer">Join the team →</a>
              </article>
            ))}
          </div>
        </section>

        <section id="outreach" className="page-section mission-dark-section">
          <SectionHeading
            inverse
            eyebrow="Eric Labrador, Outreach Director"
            title="Outreach Ministries"
            body="Every gift, can of food, and volunteer hour becomes real help for a family who needs it. Here’s how we carry that out."
          />
          <div className="impact-grid">
            <article>
              <strong>7+</strong>
              <h3>Restoration homes</h3>
              <p>
                Men’s clothing and hygiene-product donations are always needed. We can coordinate
                pickup for items you would like to give.
              </p>
            </article>
            <article>
              <strong>3×</strong>
              <h3>Homeless ministry each week</h3>
              <p>
                Alongside Pastor Frank and United We All Can, members volunteer to serve our
                neighbours. Contact Eric Labrador at 786.285.4498.
              </p>
            </article>
            <article>
              <strong>5+</strong>
              <h3>Community-impact events each year</h3>
              <p>
                Food drives, donations, and volunteer opportunities support our island and our
                external missions.
              </p>
            </article>
          </div>
        </section>

        <section id="worship-team" className="page-section mission-light-section">
          <div className="split-layout split-layout--reverse">
            <ImageAlbum
              images={[
                {
                  src: '/images/worship-choir.png',
                  label: 'Our choir',
                  alt: 'The Lighthouse Worship choir performing together',
                },
                {
                  src: '/images/church-sanctuary.png',
                  label: 'Inside our sanctuary',
                  alt: 'Inside the Key Biscayne Community Church sanctuary',
                },
                {
                  src: '/images/church-glenridge.png',
                  label: 'Our church',
                  alt: 'Key Biscayne Community Church on Glenridge Road',
                },
              ]}
            />
            <div>
              <SectionHeading
                eyebrow="Lighthouse worship team"
                title="A glimpse into our dedicated and inspiring worship team"
              />
              <p className="lead">
                Lighthouse Worship brings together the Lord’s servants to share their gifts and
                glorify God. Coming from many backgrounds, these musicians give their all for Jesus
                and serve through music.
              </p>
              <blockquote className="large-quote">
                “Speak to one another with psalms, hymns, and songs from the Spirit. Sing and make
                music from your heart to the Lord.”
                <cite>Ephesians 5:19</cite>
              </blockquote>
            </div>
          </div>
        </section>

        <section id="volunteer" className="page-section volunteer-section">
          <div className="contact-layout">
            <div>
              <p className="eyebrow eyebrow--gold">Give your time</p>
              <h2>Sign up to volunteer</h2>
              <p>
                Tell us where you’d like to help—worship, youth, outreach, or wherever you’re
                needed most—and we’ll follow up with next steps.
              </p>
            </div>
            <VolunteerForm />
          </div>
          <SiteFooter inverse />
        </section>
      </main>
    </div>
  )
}
