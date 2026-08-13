import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react'

export type PlazaMapStall = {
  eventStallId: string
  stallCode: string
  tier: 'standard' | 'corner' | 'premium'
  priceCents: number
  bookingId: string | null
}

type PlazaMapProps = {
  stalls: Array<PlazaMapStall>
  selectedStallId: string
  currentEventStallId?: string | null
  onSelect: (eventStallId: string) => void
}

type Camera = { x: number; y: number; scale: number }
type Point = readonly [number, number]
type BoxKind = PlazaMapStall['tier'] | 'available' | 'booked'
type MapBox = {
  code: string
  sourceKind: BoxKind
  top: string
  right: string
  left: string
  depth: number
}

const viewBox = { x: 120, y: 40, width: 3120, height: 1720 }
const initialCamera: Camera = { x: 0, y: 0, scale: 1 }

const palettes = {
  standard: { top: '#fbfcf9', right: '#dfe3db', left: '#edefe8', stroke: '#466d5a', width: 2.5 },
  corner: { top: '#fbfcf9', right: '#dfe3db', left: '#edefe8', stroke: '#4a8fce', width: 3 },
  premium: { top: '#fbfcf9', right: '#dfe3db', left: '#edefe8', stroke: '#dda43a', width: 3 },
  booked: { top: '#c8ccc4', right: '#a7aca3', left: '#babeb6', stroke: '#92998f', width: 1.5 },
  selected: { top: '#2f7d4f', right: '#1f5a38', left: '#276a44', stroke: '#17512f', width: 2.5 },
} as const

function buildScene() {
  const offsetX = 1240
  const offsetY = 190
  const scale = 1.6
  const height = 96
  const boxes: Array<MapBox> = []
  const footprints: Array<{ x: number; y: number; width: number; height: number }> = []
  const zoneCounts: Record<string, number> = {}

  const project = (x: number, y: number): Point => [(x - y) + offsetX, (x + y) * 0.5 + offsetY]
  const point = ([x, y]: Point) => `${x.toFixed(1)},${y.toFixed(1)}`
  const zoneFor = (centerX: number) =>
    centerX < 240 ? 'A' : centerX < 480 ? 'B' : centerX < 720 ? 'C' : centerX < 980 ? 'D' : 'E'

  const addBox = (x: number, y: number, width: number, depth: number, sourceKind: BoxKind) => {
    footprints.push({ x, y, width, height: depth })
    const leftBack = project(x * scale, y * scale)
    const rightBack = project((x + width) * scale, y * scale)
    const rightFront = project((x + width) * scale, (y + depth) * scale)
    const leftFront = project(x * scale, (y + depth) * scale)
    const lift = ([px, py]: Point): Point => [px, py - height]
    const topLeftBack = lift(leftBack)
    const topRightBack = lift(rightBack)
    const topRightFront = lift(rightFront)
    const topLeftFront = lift(leftFront)
    const zone = zoneFor(x + width / 2)
    zoneCounts[zone] = (zoneCounts[zone] ?? 0) + 1

    boxes.push({
      code: `${zone}${zoneCounts[zone]}`,
      sourceKind,
      top: `${point(topLeftBack)} ${point(topRightBack)} ${point(topRightFront)} ${point(topLeftFront)}`,
      right: `${point(rightBack)} ${point(rightFront)} ${point(topRightFront)} ${point(topRightBack)}`,
      left: `${point(leftFront)} ${point(rightFront)} ${point(topRightFront)} ${point(topLeftFront)}`,
      depth: x + width / 2 + y + depth / 2,
    })
  }

  addBox(632, 15, 66, 58, 'booked')
  addBox(700, 15, 60, 58, 'booked')
  addBox(762, 15, 48, 58, 'corner')
  addBox(812, 15, 150, 50, 'premium')
  ;[85, 142, 199, 256, 313].forEach((x) => addBox(x, 95, 53, 45, 'available'))
  addBox(380, 95, 128, 55, 'booked')
  addBox(510, 95, 120, 55, 'booked')
  addBox(632, 85, 66, 40, 'booked')
  addBox(945, 70, 63, 18, 'available')
  addBox(945, 94, 63, 26, 'booked')
  addBox(945, 126, 63, 34, 'booked')
  addBox(945, 164, 63, 14, 'available')
  addBox(85, 185, 53, 48, 'available')
  addBox(142, 185, 53, 48, 'available')
  addBox(256, 185, 120, 48, 'booked')
  addBox(380, 185, 58, 48, 'available')
  addBox(442, 185, 58, 48, 'available')
  addBox(510, 185, 58, 48, 'booked')
  addBox(570, 185, 58, 48, 'booked')
  addBox(632, 185, 66, 48, 'premium')
  addBox(805, 185, 68, 48, 'booked')
  addBox(875, 185, 68, 48, 'corner')
  addBox(945, 185, 63, 48, 'available')
  addBox(5, 250, 78, 52, 'corner')
  addBox(85, 250, 53, 52, 'available')
  addBox(140, 250, 68, 52, 'booked')
  addBox(256, 250, 170, 52, 'premium')
  addBox(430, 250, 78, 52, 'booked')
  addBox(510, 250, 58, 52, 'booked')
  addBox(570, 250, 58, 52, 'booked')
  addBox(632, 250, 66, 52, 'booked')
  addBox(805, 250, 68, 52, 'booked')
  addBox(875, 250, 68, 52, 'booked')
  addBox(945, 250, 63, 52, 'corner')
  addBox(1058, 250, 62, 52, 'booked')
  addBox(256, 335, 58, 44, 'booked')
  addBox(315, 335, 54, 44, 'available')
  addBox(380, 335, 62, 44, 'premium')
  addBox(444, 335, 62, 44, 'booked')
  addBox(508, 335, 62, 44, 'booked')
  addBox(572, 335, 62, 44, 'booked')
  addBox(636, 335, 62, 44, 'corner')
  addBox(805, 335, 68, 44, 'booked')
  addBox(875, 335, 68, 44, 'available')
  addBox(945, 335, 63, 44, 'booked')
  addBox(1012, 360, 63, 48, 'corner')
  addBox(256, 385, 58, 42, 'booked')
  addBox(315, 385, 54, 42, 'available')
  addBox(380, 385, 62, 42, 'booked')
  addBox(444, 385, 62, 42, 'booked')
  addBox(508, 385, 62, 42, 'booked')
  addBox(572, 385, 62, 42, 'premium')
  addBox(636, 385, 62, 42, 'premium')
  addBox(805, 385, 68, 42, 'booked')
  addBox(875, 385, 68, 42, 'available')
  addBox(945, 385, 63, 42, 'corner')
  addBox(5, 455, 78, 60, 'corner')
  addBox(256, 455, 58, 60, 'booked')
  addBox(315, 455, 54, 60, 'available')
  addBox(380, 455, 62, 60, 'booked')
  addBox(444, 455, 62, 60, 'booked')
  addBox(508, 455, 62, 60, 'booked')
  addBox(572, 455, 126, 60, 'premium')
  addBox(805, 455, 68, 60, 'premium')
  addBox(875, 455, 68, 60, 'booked')
  addBox(945, 455, 63, 60, 'booked')
  addBox(1010, 455, 46, 60, 'corner')
  addBox(1120, 435, 60, 45, 'corner')
  addBox(1120, 485, 60, 35, 'available')
  addBox(1120, 525, 70, 34, 'booked')
  addBox(1120, 560, 70, 30, 'booked')
  addBox(1120, 592, 70, 32, 'booked')

  const padPolygon = (x: number, y: number, width: number, depth: number) => {
    const points = [
      project(x * scale, y * scale),
      project((x + width) * scale, y * scale),
      project((x + width) * scale, (y + depth) * scale),
      project(x * scale, (y + depth) * scale),
    ]
    return points.map(point).join(' ')
  }
  const padDefinitions = [
    { x: 85, y: 15, width: 545, depth: 58 },
    { x: 150, y: 575, width: 905, depth: 55 },
  ]
  const pads = padDefinitions.map((pad) => padPolygon(pad.x, pad.y, pad.width, pad.depth))
  const padGap = 26
  padDefinitions.forEach((pad) =>
    footprints.push({
      x: pad.x - padGap,
      y: pad.y - padGap,
      width: pad.width + padGap * 2,
      height: pad.depth + padGap * 2,
    }),
  )

  const roads: Array<string> = []
  const intersectsFootprint = (x: number, y: number, margin: number) =>
    footprints.some(
      (footprint) =>
        x > footprint.x - margin &&
        x < footprint.x + footprint.width + margin &&
        y > footprint.y - margin &&
        y < footprint.y + footprint.height + margin,
    )
  const addRoad = (x: number, y: number, width: number, depth: number) => {
    const tileSize = 20
    const columns = Math.max(1, Math.round(width / tileSize))
    const rows = Math.max(1, Math.round(depth / tileSize))
    const tileWidth = width / columns
    const tileDepth = depth / rows
    const overlap = 0.7

    for (let column = 0; column < columns; column += 1) {
      for (let row = 0; row < rows; row += 1) {
        const tileX = x + column * tileWidth
        const tileY = y + row * tileDepth
        const centerX = tileX + tileWidth / 2
        const centerY = tileY + tileDepth / 2
        if (centerY > 632 || intersectsFootprint(centerX, centerY, 6)) continue
        roads.push(
          [
            project((tileX - overlap) * scale, (tileY - overlap) * scale),
            project((tileX + tileWidth + overlap) * scale, (tileY - overlap) * scale),
            project((tileX + tileWidth + overlap) * scale, (tileY + tileDepth + overlap) * scale),
            project((tileX - overlap) * scale, (tileY + tileDepth + overlap) * scale),
          ]
            .map(point)
            .join(' '),
        )
      }
    }
  }

  addRoad(-14, -14, 30, 672)
  addRoad(214, -14, 34, 672)
  addRoad(700, -14, 95, 672)
  addRoad(1018, -14, 28, 672)
  addRoad(-14, 150, 1220, 30)
  addRoad(-14, 300, 1220, 26)
  addRoad(-14, 425, 1220, 30)
  addRoad(-14, 512, 1220, 26)

  const parkingCenter = project((150 + 905 / 2) * scale, (575 + 55 / 2) * scale)
  return { boxes: boxes.sort((a, b) => a.depth - b.depth), pads, roads, parkingCenter }
}

const scene = buildScene()
const moneyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function PlazaMap({ stalls, selectedStallId, currentEventStallId, onSelect }: PlazaMapProps) {
  const [camera, setCamera] = useState<Camera>(initialCamera)
  const [dragging, setDragging] = useState(false)
  const drag = useRef({ active: false, moved: false, stallCode: null as string | null, x: 0, y: 0 })
  const inventory = useMemo(() => new Map(stalls.map((stall) => [stall.stallCode, stall])), [stalls])

  const zoomAt = (x: number, y: number, factor: number) => {
    setCamera((current) => {
      const scale = Math.max(0.5, Math.min(4, current.scale * factor))
      const contentX = (x - current.x) / current.scale
      const contentY = (y - current.y) / current.scale
      return { scale, x: x - contentX * scale, y: y - contentY * scale }
    })
  }

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    const stallElement = (event.target as Element).closest<SVGGElement>('[data-stall-code]')
    drag.current = {
      active: true,
      moved: false,
      stallCode: stallElement?.dataset.stallCode ?? null,
      x: event.clientX,
      y: event.clientY,
    }
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!drag.current.active) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const ratio = viewBox.width / bounds.width
    const deltaX = (event.clientX - drag.current.x) * ratio
    const deltaY = (event.clientY - drag.current.y) * ratio
    if (Math.abs(event.clientX - drag.current.x) + Math.abs(event.clientY - drag.current.y) > 3) {
      drag.current.moved = true
    }
    drag.current.x = event.clientX
    drag.current.y = event.clientY
    setCamera((current) => ({ ...current, x: current.x + deltaX, y: current.y + deltaY }))
  }

  const handlePointerUp = (event: PointerEvent<SVGSVGElement>) => {
    const { moved, stallCode } = drag.current
    drag.current.active = false
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (!moved && stallCode) {
      const stall = inventory.get(stallCode)
      const isCurrent = stall?.eventStallId === currentEventStallId
      const isBooked = !stall || (Boolean(stall.bookingId) && !isCurrent)
      if (stall && !isBooked) onSelect(stall.eventStallId)
    }
  }

  const handleWheel = (event: WheelEvent<SVGSVGElement>) => {
    event.preventDefault()
    const bounds = event.currentTarget.getBoundingClientRect()
    const renderedScale = bounds.width / viewBox.width
    const verticalOffset = (bounds.height - viewBox.height * renderedScale) / 2
    const x = viewBox.x + (event.clientX - bounds.left) / renderedScale
    const y = viewBox.y + (event.clientY - bounds.top - verticalOffset) / renderedScale
    zoomAt(x, y, event.deltaY < 0 ? 1.12 : 1 / 1.12)
  }

  const chooseStall = (stall: PlazaMapStall | undefined, isBooked: boolean) => {
    if (!stall || isBooked) return
    onSelect(stall.eventStallId)
  }

  const handleStallKeyDown = (
    event: KeyboardEvent<SVGGElement>,
    stall: PlazaMapStall | undefined,
    isBooked: boolean,
  ) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    chooseStall(stall, isBooked)
  }

  return (
    <>
      <svg
        className={`plaza-map__svg${dragging ? ' is-dragging' : ''}`}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        preserveAspectRatio="xMidYMid meet"
        role="region"
        aria-label="Interactive three-dimensional plaza stall map"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        <g transform={`translate(${camera.x} ${camera.y}) scale(${camera.scale})`}>
          {scene.pads.map((points) => (
            <polygon key={points} points={points} fill="#c6cbc4" stroke="#b3b8b1" strokeWidth="2" />
          ))}
          {scene.roads.map((points) => (
            <polygon key={points} points={points} fill="#f3f4ee" stroke="#e6e8e0" strokeWidth="1.5" />
          ))}
          {scene.boxes.map((box) => {
            const stall = inventory.get(box.code)
            const isCurrent = stall?.eventStallId === currentEventStallId
            const isBooked = !stall || (Boolean(stall.bookingId) && !isCurrent)
            const isSelected = stall?.eventStallId === selectedStallId
            const tier = stall?.tier ?? (box.sourceKind === 'corner' || box.sourceKind === 'premium' ? box.sourceKind : 'standard')
            const palette = isSelected ? palettes.selected : isBooked ? palettes.booked : palettes[tier]
            const state = isCurrent ? 'your current stall' : isBooked ? 'booked' : 'available'
            const label = stall
              ? `Stall ${stall.stallCode}, ${tier}, ${moneyFormatter.format(stall.priceCents / 100)}, ${state}`
              : `Stall ${box.code}, booked`

            return (
              <g
                key={box.code}
                className="plaza-map__stall"
                role="button"
                tabIndex={0}
                aria-label={label}
                aria-disabled={isBooked}
                aria-pressed={isSelected}
                data-tier={tier}
                data-stall-code={box.code}
                onClick={() => chooseStall(stall, isBooked)}
                onKeyDown={(event) => handleStallKeyDown(event, stall, isBooked)}
              >
                <title>{label}</title>
                <polygon points={box.left} fill={palette.left} stroke={palette.stroke} strokeWidth={palette.width} />
                <polygon points={box.right} fill={palette.right} stroke={palette.stroke} strokeWidth={palette.width} />
                <polygon points={box.top} fill={palette.top} stroke={palette.stroke} strokeWidth={palette.width} />
              </g>
            )
          })}
          <text
            className="plaza-map__parking-label"
            x={scene.parkingCenter[0]}
            y={scene.parkingCenter[1]}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            Parking Area
          </text>
        </g>
      </svg>
      <div className="plaza-map__zoom" aria-label="Map zoom controls">
        <button type="button" onClick={() => zoomAt(viewBox.x + viewBox.width / 2, viewBox.y + viewBox.height / 2, 1.25)} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => zoomAt(viewBox.x + viewBox.width / 2, viewBox.y + viewBox.height / 2, 1 / 1.25)} aria-label="Zoom out">−</button>
        <button type="button" onClick={() => setCamera(initialCamera)}>Reset</button>
      </div>
    </>
  )
}
