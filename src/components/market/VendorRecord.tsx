import { isFoodCategory, type DocKind } from '../../market/rules'

type DocSource = {
  docs: Partial<Record<DocKind, string>>
  docLinks?: Partial<Record<DocKind, string>>
  insuranceProvider: string
  policyNumber: string
  website: string
  category: string
}

// The document rows shown to vendors and admins: uploaded file names, the policy, or what's missing.
export function documentRows(v: DocSource) {
  const d = v.docs
  const link = (kind: DocKind) => (d[kind] ? v.docLinks?.[kind] : undefined)
  const rows: Array<DocRow> = [
    ['Photo ID', d.photoId ?? '', link('photoId')],
    ['Liability insurance certificate', d.insurance ?? '', link('insurance')],
    ['Insurance provider & policy #', v.insuranceProvider && v.policyNumber ? `${v.insuranceProvider} · ${v.policyNumber}` : ''],
    ['Merchandise photos', d.photos || (v.website ? `Website given: ${v.website}` : ''), link('photos')],
  ]
  if (isFoodCategory(v.category)) {
    rows.push(["Food handler's permit", d.foodPermit ?? '', link('foodPermit')], ['Mobile vending permit', d.mobilePermit || 'Not applicable', link('mobilePermit')])
  }
  return rows
}

type DocRow = [label: string, value: string, href?: string]

export function DocumentList({ rows, missing, missingTone }: { rows: Array<DocRow>; missing: string; missingTone: 'muted' | 'alert' }) {
  return (
    <div className="fm-docs">
      {rows.map(([label, value, href]) =>
        href ? (
          <a key={label} className="fm-docs__item fm-docs__item--link" href={href} target="_blank" rel="noopener">
            <div className="fm-docs__label">{label}</div>
            <div className="fm-docs__value">
              {value} <span className="fm-docs__open">Open ↗</span>
            </div>
          </a>
        ) : (
          <div key={label} className="fm-docs__item">
            <div className="fm-docs__label">{label}</div>
            <div className={value ? 'fm-docs__value' : `fm-docs__value is-${missingTone}`}>{value || missing}</div>
          </div>
        ),
      )}
    </div>
  )
}

export function FieldList({ fields, strong = false }: { fields: Array<[string, string]>; strong?: boolean }) {
  return (
    <>
      {fields.map(([label, value]) => (
        <div key={label}>
          <div className="ad-label">{label}</div>
          <div className={strong ? 'fm-fieldval is-strong' : 'fm-fieldval'}>{value.trim() || 'Not provided'}</div>
        </div>
      ))}
    </>
  )
}
