
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
