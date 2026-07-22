import { useEffect, useState } from 'react'

type SectionNavProps = {
  sections: ReadonlyArray<{ id: string; label: string }>
}

export function SectionNav({ sections }: SectionNavProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '')

  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.snap-page')
    const sectionElements = sections
      .map(({ id }) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section))

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActiveId(visible.target.id)
      },
      { root, threshold: [0.35, 0.55, 0.75] },
    )

    sectionElements.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [sections])

  return (
    <nav className="section-nav" aria-label="Page sections">
      {sections.map((section) => (
        <a
          key={section.id}
          className={activeId === section.id ? 'is-active' : undefined}
          href={`#${section.id}`}
          aria-label={section.label}
          aria-current={activeId === section.id ? 'true' : undefined}
        >
          <span>{section.label}</span>
        </a>
      ))}
    </nav>
  )
}

type ScrollCueProps = {
  target: string
  label?: string
  inverse?: boolean
}

export function ScrollCue({ target, label = 'Scroll', inverse = false }: ScrollCueProps) {
  return (
    <a className={`scroll-cue${inverse ? ' scroll-cue--inverse' : ''}`} href={`#${target}`}>
      <span>{label}</span>
      <span aria-hidden="true">↓</span>
    </a>
  )
}
