// Plaza layout from "FM Map 2026": [zone, y-top, y-bottom, [x-left, x-right] pairs] in the PDF's coordinates.
// Stall numbers run left to right, top to bottom within each zone.
// The dotted boxes under Zone A are not stalls, so Zone A is its one row of 13.
const MAP_ROWS: Array<[Zone, number, number, Array<[number, number]>]> = [
  ['E', 101, 178, [[362, 419]]],
  ['E', 101, 151, [[419, 474], [474, 528]]],
  ['E', 191, 238, [[362, 419]]],
  ['E', 205, 250, [[24, 61], [61, 98], [98, 153], [153, 205], [205, 253], [253, 307], [307, 362]]],
  ['E', 304, 350, [[24, 61], [61, 98], [153, 253], [253, 307], [307, 362], [362, 419], [419, 474], [474, 528]]],
  ['E', 164, 204, [[637, 691]]],
  ['E', 225, 251, [[637, 691]]],
  ['E', 251, 304, [[637, 691]]],
  ['E', 317, 350, [[637, 691]]],
  ['A', 363, 415, [[153, 253], [253, 307], [307, 362], [362, 419], [419, 474], [474, 528], [528, 583], [637, 691], [691, 746], [746, 800], [800, 856], [856, 912], [912, 967]]],
  ['B', 456, 502, [[153, 205], [205, 307], [307, 362], [362, 419], [419, 474], [474, 528], [528, 583], [583, 637], [637, 691], [691, 746]]],
  ['B', 475, 536, [[746, 800]]],
  ['B', 502, 550, [[153, 205], [205, 253], [253, 307], [307, 362], [362, 419], [419, 474], [474, 528], [528, 583], [583, 637], [637, 691], [691, 746]]],
  ['C', 576, 626, [[24, 61], [153, 205], [205, 253], [253, 307], [307, 362], [362, 419], [419, 528], [637, 691], [691, 746], [746, 800], [800, 856]]],
  ['D', 350, 400, [[1021, 1075]]],
  ['D', 400, 442, [[1021, 1075]]],
  ['D', 442, 488, [[1021, 1075]]],
  ['D', 488, 536, [[1021, 1075]]],
  ['D', 536, 576, [[1021, 1075]]],
  ['D', 576, 626, [[1021, 1075]]],
]

export type Zone = 'A' | 'B' | 'C' | 'D' | 'E'

export const ZONES: Array<Zone> = ['A', 'B', 'C', 'D', 'E']

export const ZONE_NOTES: Record<Zone, string> = {
  A: 'Middle of the market',
  B: 'Second row from the church',
  C: 'Closest to the church building',
  D: 'East edge',
  E: 'North end',
}

export const ZONE_COLORS: Record<Zone, string> = {
  A: '#e6def2',
  B: '#d8e6e9',
  C: '#f6dcc4',
  D: '#dae7f5',
  E: '#f4d6d8',
}

export const MAP_BOX = { x: 18, y: 92, w: 1062, h: 640 }

const pct = (a: number, b: number, d: number) => `${(((a - b) / d) * 100).toFixed(3)}%`

export type PlazaBox = { left: string; top: string; width: string; height: string }

function box(x1: number, x2: number, y1: number, y2: number): PlazaBox {
  return {
    left: pct(x1, MAP_BOX.x, MAP_BOX.w),
    top: pct(y1, MAP_BOX.y, MAP_BOX.h),
    width: pct(x2, x1, MAP_BOX.w),
    height: pct(y2, y1, MAP_BOX.h),
  }
}

export type Stall = PlazaBox & { id: number; zone: Zone; label: string; x1: number; x2: number; y1: number; y2: number }

export const STALLS: Array<Stall> = (() => {
  const count: Partial<Record<Zone, number>> = {}
  const out: Array<Stall> = []
  let id = 1
  for (const [zone, y1, y2, xs] of MAP_ROWS) {
    for (const [x1, x2] of xs) {
      count[zone] = (count[zone] ?? 0) + 1
      out.push({ id, zone, label: `${zone}${count[zone]}`, x1, x2, y1, y2, ...box(x1, x2, y1, y2) })
      id += 1
    }
  }
  return out
})()

export const STALL_BY_ID = new Map(STALLS.map((stall) => [stall.id, stall]))

export function stallLabel(id: number) {
  return STALL_BY_ID.get(id)?.label ?? '?'
}

export function isStallId(id: number) {
  return STALL_BY_ID.has(id)
}

type Landmark = PlazaBox & { label: string; church: boolean; background: string }

const LANDMARK_SOURCE: Array<{ label: string; box: [number, number, number, number]; bg: string; church?: true }> = [
  { label: 'Church Building', box: [98, 856, 652, 719], bg: '#e6e9e5', church: true },
  { label: 'Zone A', box: [98, 153, 363, 415], bg: '#e6def2' },
  { label: 'Zone B', box: [98, 153, 456, 550], bg: '#d8e6e9' },
  { label: 'Zone C', box: [98, 153, 576, 626], bg: '#f6dcc4' },
  { label: 'Zone D', box: [1021, 1075, 317, 350], bg: '#dae7f5' },
  { label: 'Zone E', box: [528, 583, 190, 238], bg: '#f4d6d8' },
]

export const LANDMARKS: Array<Landmark> = LANDMARK_SOURCE.map((l) => ({
  label: l.label,
  church: !!l.church,
  background: l.bg,
  ...box(l.box[0], l.box[1], l.box[2], l.box[3]),
}))
