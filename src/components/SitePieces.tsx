import { weeklySchedule } from '../site-data'

export function SectionHeading({
  eyebrow,
  title,
  body,
  inverse = false,
}: {
  eyebrow: string
  title: string
  body?: string
  inverse?: boolean
}) {
  return (
    <header className={`section-heading${inverse ? ' section-heading--inverse' : ''}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {body ? <p className="section-heading__body">{body}</p> : null}
    </header>
  )
}

export function ScheduleList({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`schedule-list${compact ? ' schedule-list--compact' : ''}`}>
      {weeklySchedule.map((item) => (
        <article key={item.name} className={`schedule-row tone-${item.tone}`}>
          <p>{item.day}</p>
          <div>
            <h3>{item.name}</h3>
            {!compact ? <span>{item.description}</span> : null}
          </div>
          <time>{item.time}</time>
        </article>
      ))}
    </div>
  )
}

export function SiteFooter({ inverse = false }: { inverse?: boolean }) {
  return (
    <footer className={`site-footer${inverse ? ' site-footer--inverse' : ''}`}>
      <p>© 1954–2026 Key Biscayne Community Church</p>
      <nav aria-label="Footer navigation">
        <a href="/about#contact">Donate</a>
        <a href="/">Home</a>
        <a href="/about#contact">Newsletter</a>
      </nav>
    </footer>
  )
}

export function ArrowLink({
  href,
  children,
  inverse = false,
}: {
  href: string
  children: React.ReactNode
  inverse?: boolean
}) {
  return (
    <a className={`arrow-link${inverse ? ' arrow-link--inverse' : ''}`} href={href}>
      <span>{children}</span>
      <span aria-hidden="true">→</span>
    </a>
  )
}
