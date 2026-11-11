// Market rules shared by the browser and the server: dates, plans, prices, categories and agreements.

export const MARKET_TIME_ZONE = 'America/New_York'
const DAY_MS = 24 * 60 * 60 * 1000

// ---------- Dates ----------
// Market days are plain 'YYYY-MM-DD' strings. Times are resolved in the market's own time zone so the
// server and every visitor agree on deadlines.

function ymd(date: string): [number, number, number] {
  const [y = 1970, m = 1, d = 1] = date.split('-').map(Number)
  return [y, m, d]
}

function zoneOffset(at: number) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MARKET_TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(new Date(at))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return asUtc - Math.floor(at / 1000) * 1000
}

export function marketTime(date: string, hours: number, minutes = 0, seconds = 0, ms = 0) {
  const [y, m, d] = ymd(date)
  const wall = Date.UTC(y, m - 1, d, hours, minutes, seconds, ms)
  const first = wall - zoneOffset(wall)
  return wall - zoneOffset(first)
}

export function marketToday(now = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: MARKET_TIME_ZONE }).format(new Date(now))
}

export function addDays(date: string, days: number) {
  const [y, m, d] = ymd(date)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

export const addWeeks = (date: string, weeks: number) => addDays(date, weeks * 7)

export function isMarketDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = ymd(value)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 6
}

// The next Saturdays after today. On a Saturday, the list starts the following week.
export function upcomingSaturdays(count: number, now = Date.now()) {
  const today = marketToday(now)
  const [y, m, d] = ymd(today)
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  const first = addDays(today, (6 - day + 7) % 7 || 7)
  return Array.from({ length: count }, (_, i) => addWeeks(first, i))
}

export const saturdayOpensAt = (date: string) => marketTime(date, 9)
// Each Saturday is due by the Monday midnight before it.
export const paymentDueAt = (date: string) => marketTime(addDays(date, -5), 23, 59, 59, 999)
export const isLate = (date: string, now = Date.now()) => now > saturdayOpensAt(date) - 72 * 60 * 60 * 1000
export const endOfMarketDay = (date: string) => marketTime(date, 23, 59, 59)
export const tomorrow = (now = Date.now()) => addDays(marketToday(now), 1)

export function fmtDay(date: string) {
  const [y, m, d] = ymd(date)
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function fmtDayYear(date: string) {
  const [y, m, d] = ymd(date)
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export const fmtMoment = (ms: number) =>
  new Date(ms).toLocaleDateString('en-US', { timeZone: MARKET_TIME_ZONE, weekday: 'short', month: 'short', day: 'numeric' })

export const fmtLong = (ms: number) =>
  new Date(ms).toLocaleDateString('en-US', { timeZone: MARKET_TIME_ZONE, month: 'long', day: 'numeric', year: 'numeric' })

export const marketDateOf = (ms: number) => marketToday(ms)

export const dayMs = DAY_MS

// ---------- Plans and prices ----------

export type Plan = 'weekly' | 'seasonal'

export const PLANS: Record<Plan, { name: string; chip: string; saturdays: number }> = {
  weekly: { name: 'Weekly plan', chip: 'Weekly', saturdays: 1 },
  seasonal: { name: 'Seasonal plan', chip: 'Seasonal', saturdays: 13 },
}

export const isPlan = (value: unknown): value is Plan => value === 'weekly' || value === 'seasonal'

export type Prices = {
  weekly: string
  seasonal: string
  tent: string
  table: string
  electricity: string
}

export type AddonStock = { tables: number; electricity: number }

export type Addons = { tent: boolean; tables: number; electricity: boolean }

export const num = (value: unknown) => Math.max(0, Number(value) || 0)
export const electricityPriced = (prices: Prices) => String(prices.electricity).trim() !== ''

export function quote(prices: Prices, plan: Plan, addons: Addons, otherExtras: string) {
  const rate = num(prices[plan])
  const tentPrice = num(prices.tent)
  const tablePrice = num(prices.table)
  const elecSet = electricityPriced(prices)
  const elecPrice = num(prices.electricity)
  const lines = [{ label: PLANS[plan].name, value: `$${rate}` }]
  const names: Array<string> = []
  let addonTotal = 0
  if (addons.tent) {
    addonTotal += tentPrice
    lines.push({ label: 'Tent', value: `$${tentPrice}` })
    names.push('Tent')
  }
  if (addons.tables > 0) {
    const amount = tablePrice * addons.tables
    addonTotal += amount
    lines.push({ label: `Tables (${addons.tables})`, value: `$${amount}` })
    names.push(`Tables (${addons.tables})`)
  }
  if (addons.electricity) {
    if (elecSet) addonTotal += elecPrice
    lines.push({ label: 'Electricity', value: elecSet ? `$${elecPrice}` : 'Price to confirm' })
    names.push('Electricity')
  }
  if (otherExtras.trim()) {
    lines.push({ label: 'Other extras', value: 'On request' })
    names.push('Other extras requested')
  }
  return { rate, perSaturday: rate + addonTotal, lines, summary: names.length ? names.join(' · ') : 'No add-ons' }
}

// Admin-entered amount for a booking: stall rate for the plan plus add-ons.
export function bookingAmount(prices: Prices, plan: Plan, addons: Addons) {
  return (
    num(prices[plan]) +
    (addons.tent ? num(prices.tent) : 0) +
    num(addons.tables) * num(prices.table) +
    (addons.electricity ? num(prices.electricity) : 0)
  )
}

// ---------- Vendors ----------

export const FOOD_CATEGORIES = ['Produce', 'Baked Goods', 'Coffee & Beverages', 'Prepared Food', 'Specialty Foods']
export const NONFOOD_CATEGORIES = ['Flowers & Plants', 'Arts & Crafts', 'Clothing & Accessories', 'Jewelry', 'Health & Beauty', 'Other']
export const ALL_CATEGORIES = [...FOOD_CATEGORIES, ...NONFOOD_CATEGORIES]
export const isFoodCategory = (category: string) => FOOD_CATEGORIES.includes(category)
export const vendorTypeLabel = (category: string) => (isFoodCategory(category) ? 'Food vendor' : 'Non-food vendor')

export const PRICE_RANGES = ['Under $10', '$10 – $25', '$25 – $50', '$50 – $100', 'Over $100']

export type AckKey = 'setup' | 'conduct' | 'liability' | 'food'

export const ACKS: Record<AckKey, { title: string; points: Array<string> }> = {
  setup: {
    title: 'Setup & cleanup',
    points: [
      'I will use a 10×10 tent with appropriate weights.',
      'Displays, signage, and attire will be clean, professional, and in good condition.',
      'I will remove all merchandise and trash at market close.',
      'I understand a $50 disposal fee applies if trash is not removed.',
    ],
  },
  conduct: {
    title: 'Conduct on church property',
    points: [
      'No tobacco, alcohol, or vape products may be sold or consumed on church property.',
      'No loud or offensive music; all audio must be appropriate to a Christian, family environment.',
      'I will dress appropriately at all times.',
      'Misconduct or policy violations may result in suspension or permanent removal.',
    ],
  },
  liability: {
    title: 'Liability & indemnification',
    points: [
      'I have read the full Liability & Indemnification clause and agree to its terms.',
      'I assume full responsibility for my products, operations, and equipment.',
      'I understand the Church is not liable for loss, damage, or transaction disputes.',
      'I am solely responsible for all applicable sales tax obligations.',
    ],
  },
  food: {
    title: 'Food safety compliance',
    points: [
      'I will comply with Florida Administrative Code 64E-11 (Food Hygiene).',
      'I will comply with Village of Key Biscayne Fire Marshal requirements and FFPC Chapter 69A-60.',
    ],
  },
}

export const ackKeys = (category: string): Array<AckKey> =>
  isFoodCategory(category) ? ['setup', 'conduct', 'liability', 'food'] : ['setup', 'conduct', 'liability']

export type DocKind = 'photoId' | 'insurance' | 'photos' | 'foodPermit' | 'mobilePermit'

export const DOC_KINDS: Array<DocKind> = ['photoId', 'insurance', 'photos', 'foodPermit', 'mobilePermit']

export function docFields(category: string, hasWebsite: boolean) {
  const defs: Array<{ kind: DocKind; label: string; hint: string; required: boolean }> = [
    { kind: 'photoId', label: 'State or federal-issued photo ID', hint: "Driver's license, passport or state ID.", required: true },
    { kind: 'insurance', label: 'Liability insurance certificate', hint: 'The Church must be listed as additional insured.', required: true },
    {
      kind: 'photos',
      label: 'Photos of your merchandise',
      hint: hasWebsite ? 'Optional, since you gave your website.' : 'Required unless you add your website in step 1.',
      required: !hasWebsite,
    },
  ]
  if (isFoodCategory(category)) {
    defs.push(
      { kind: 'foodPermit', label: "Food handler's permit", hint: 'Your current permit from the Florida Department of Health.', required: true },
      { kind: 'mobilePermit', label: 'Mobile vending permit', hint: 'Only if your business needs one.', required: false },
    )
  }
  return defs
}

export type ApplicationDraft = {
  category: string
  address: string
  website: string
  products: string
  insuranceProvider: string
  policyNumber: string
  docs: Partial<Record<DocKind, string>>
  acks: Array<AckKey>
}

export function stepErrors(step: 1 | 2 | 3, a: ApplicationDraft) {
  const out: Array<string> = []
  if (step === 1) {
    if (!a.category) out.push('Choose a category.')
    if (!a.address.trim()) out.push('Add your business address.')
    if (!a.products.trim()) out.push('Describe the merchandise or products you will sell.')
  }
  if (step === 2) {
    if (!a.docs.photoId) out.push('Upload a state or federal-issued photo ID.')
    if (!a.docs.insurance) out.push('Upload your liability insurance certificate.')
    if (!a.insuranceProvider.trim() || !a.policyNumber.trim()) out.push('Add your insurance provider and policy number.')
    if (!a.docs.photos && !a.website.trim()) out.push('Upload photos of your merchandise, or add your website in step 1.')
    if (isFoodCategory(a.category) && !a.docs.foodPermit) out.push("Upload your current food handler's permit.")
  }
  if (step === 3) {
    if (ackKeys(a.category).some((k) => !a.acks.includes(k))) out.push('Tick to agree to each section.')
  }
  return out
}

// ---------- Booking day states ----------

export type DayStatus = 'due' | 'confirming' | 'paid' | 'waived' | 'cancelled' | 'released'
export const ACTIVE_STATUSES: Array<DayStatus> = ['due', 'confirming', 'paid', 'waived']
export const isActiveStatus = (status: DayStatus) => ACTIVE_STATUSES.includes(status)

// ---------- Public page content ----------

export const VENDOR_LOGOS = [
  { name: 'Aficionados USA', image: '/images/vendors/aficionados-usa.jpg', bg: '#000000' },
  { name: 'Aguayo & Arturo', image: '/images/vendors/aguayo-arturo.jpg', bg: '#ffffff' },
  { name: 'Bamboochi', image: '/images/vendors/bamboochi.jpg', bg: '#f8e0d4' },
  { name: 'Eloah Food', image: '/images/vendors/eloah-food.jpg', bg: '#8fb8a0' },
  { name: "Emily's Place", image: '', bg: '#f4faf6' },
  { name: 'GreenGrass Style', image: '/images/vendors/greengrass-style.jpg', bg: '#ffffff' },
  { name: 'Il Mercato', image: '/images/vendors/il-mercato.jpg', bg: '#ffffff' },
  { name: "Jo's Flavored Lemonade", image: '/images/vendors/jos-lemonade.jpg', bg: '#ffffff' },
  { name: 'KeyCan Food', image: '/images/vendors/keycan-food.jpg', bg: '#ffffff' },
  { name: 'La Trattoria', image: '/images/vendors/la-trattoria.jpg', bg: '#ffffff' },
  { name: 'Latta Beachwear', image: '/images/vendors/latta.jpg', bg: '#f6f4db' },
  { name: 'Lombaggi Moda Europea', image: '/images/vendors/lombaggi.jpg', bg: '#ffffff' },
  { name: 'Mate Wearable Art', image: '/images/vendors/mate.jpg', bg: '#e6e0d2' },
  { name: 'NMC Pottery', image: '/images/vendors/nmc-pottery.jpg', bg: '#ffffff' },
  { name: 'Pantic Jewels', image: '/images/vendors/pantic-jewels.jpg', bg: '#ffffff' },
  { name: 'Re-Active', image: '/images/vendors/re-active.jpg', bg: '#c1e0fc' },
  { name: 'Rusticko', image: '/images/vendors/rusticko.jpg', bg: '#000d24' },
  { name: 'Sirius Boutique', image: '/images/vendors/sirius-boutique.jpg', bg: '#ffffff' },
  { name: 'Soléa Delights', image: '/images/vendors/solea-delights.jpg', bg: '#f8eee1' },
  { name: 'Verace Artisan Pizzeria', image: '/images/vendors/verace.jpg', bg: '#ffffff' },
  { name: 'Viani Milano', image: '/images/vendors/viani-milano.jpg', bg: '#ffffff' },
  { name: 'Wapas', image: '/images/vendors/wapas.jpg', bg: '#000000' },
]

export const MARKET_CATEGORIES = ['Produce', 'Baked Goods', 'Coffee & Beverages', 'Flowers & Plants', 'Prepared Food', 'Crafts & Goods']
export const TICKER_ITEMS = ['FRESH PRODUCE', 'BAKED GOODS', 'COFFEE', 'FLOWERS & PLANTS', 'PREPARED FOOD', 'CRAFTS & GOODS', 'LIVE MUSIC']
