import type { ChangeEventHandler } from 'react'
import { FOOD_CATEGORIES, NONFOOD_CATEGORIES } from '../../market/rules'

export function CategorySelect({
  className,
  value,
  onChange,
}: {
  className: string
  value: string
  onChange: ChangeEventHandler<HTMLSelectElement>
}) {
  return (
    <select className={className} value={value} onChange={onChange}>
      <option value="">Choose a category</option>
      <optgroup label="Food">
        {FOOD_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </optgroup>
      <optgroup label="Non-food">
        {NONFOOD_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </optgroup>
    </select>
  )
}
