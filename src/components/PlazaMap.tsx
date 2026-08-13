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
type StallTier = PlazaMapStall['tier']
type FaceSet = { front: string; top: string; right: string }
type MapStall = FaceSet & {
  code: string | null
  sourceTier: StallTier | 'booked'
  shadow: string
}

const viewBox = { x: 0, y: 300, width: 1098, height: 819 }
const initialCamera: Camera = { x: 0, y: 0, scale: 1 }

const palettes = {
  standard: { front: 'url(#stall-front)', top: 'url(#stall-top)', right: 'url(#stall-right)', stroke: '#4c6d5a', width: 3 },
  corner: { front: 'url(#stall-front)', top: 'url(#stall-top)', right: 'url(#stall-right)', stroke: '#4a90d9', width: 3 },
  premium: { front: 'url(#stall-front)', top: 'url(#stall-top)', right: 'url(#stall-right)', stroke: '#e2a012', width: 3 },
  booked: { front: '#c7cdc6', top: '#c7cdc6', right: '#c7cdc6', stroke: '#8b908b', width: 2 },
  selected: { front: '#2f7a56', top: '#2f7a56', right: '#254f38', stroke: '#123021', width: 3 },
} as const

const backRoads = [
  '320,628 616,452 635,463 338,639',
  '629.5,643 220,406 239,396 648.5,632.5',
]

const middleRoads = [
  '485,1181 759,1016 778,1027 504,1192',
  '756,1018 1030,853 1049,864 775,1029',
  '1031,875 621,638 640,628 1050,864',
  '463.5,722 56,486 75,476 484.5,712.5',
]

const parkingArea = '293.5,818 539.5,702 904.5,909.5 672,1043'

const mapStalls: Array<MapStall> = [
  {
    code: 'A1', sourceTier: 'standard',
    front: '103,365.5 171,403.5 171,517.5 103,479.5',
    top: '103,365.5 147,339 215,378 171,403.5',
    right: '171,403.5 215,378 215,492.5 171,517.5',
    shadow: '171,517.5 215,492.5 215,458 272.5,486 211,519.5',
  },
  {
    code: 'A2', sourceTier: 'standard',
    front: '256,278.5 324,316.5 324,430.5 256,392.5',
    top: '256,278.5 300,252 368,291 324,316.5',
    right: '324,316.5 368,291 368,405.5 324,430.5',
    shadow: '324,430.5 368,405.5 368,371 425.5,399 364,432.5',
  },
  {
    code: 'A3', sourceTier: 'standard',
    front: '188,411.5 256,449.5 256,563.5 188,525.5',
    top: '188,411.5 232,385 300,424 256,449.5',
    right: '256,449.5 300,424 300,538.5 256,563.5',
    shadow: '256,563.5 300,538.5 300,504 357.5,532 296,565.5',
  },
  {
    code: 'A4', sourceTier: 'standard',
    front: '341,324.5 409,362.5 409,476.5 341,438.5',
    top: '341,324.5 385,298 453,337 409,362.5',
    right: '409,362.5 453,337 453,451.5 409,476.5',
    shadow: '409,476.5 453,451.5 453,417 510.5,445 449,478.5',
  },
  {
    code: 'B1', sourceTier: 'premium',
    front: '280,465 324,490 324,605 280,580',
    top: '280,465 366,415 408.5,441.5 324,490',
    right: '324,490 408.5,441.5 408.5,555.5 324,605',
    shadow: '324,605 408.5,555.5 408.5,521.5 466,549.285 370.5,605',
  },
  {
    code: null, sourceTier: 'booked',
    front: '431,374 475,399 475,514 431,489',
    top: '431,374 517,324 559.5,350.5 475,399',
    right: '475,399 559.5,350.5 559.5,464.5 475,514',
    shadow: '475,514 559.5,464.5 559.5,430.5 617,458.285 521.5,514',
  },
  {
    code: 'B2', sourceTier: 'premium',
    front: '392,534 436,559 436,674 392,649',
    top: '392,534 478,484 520.5,510.5 436,559',
    right: '436,559 520.5,510.5 520.5,624.5 436,674',
    shadow: '436,674 520.5,624.5 520.5,590.5 578,618.285 482.5,674',
  },
  {
    code: 'B3', sourceTier: 'premium',
    front: '553,443 597,468 597,583 553,558',
    top: '553,443 639,393 681.5,419.5 597,468',
    right: '597,468 681.5,419.5 681.5,533.5 597,583',
    shadow: '597,583 681.5,533.5 681.5,499.5 739,527.285 643.5,583',
  },
  {
    code: null, sourceTier: 'booked',
    front: '628,492.5 696,530.5 696,644.5 628,606.5',
    top: '628,492.5 672,466 740,505 696,530.5',
    right: '696,530.5 740,505 740,619.5 696,644.5',
    shadow: '696,644.5 740,619.5 740,585 797.5,613 736,646.5',
  },
  {
    code: null, sourceTier: 'booked',
    front: '709,539.5 777,577.5 777,691.5 709,653.5',
    top: '709,539.5 753,513 821,552 777,577.5',
    right: '777,577.5 821,552 821,666.5 777,691.5',
    shadow: '777,691.5 821,666.5 821,632 878.5,660 817,693.5',
  },
  {
    code: 'C1', sourceTier: 'standard',
    front: '794,586.5 862,624.5 862,738.5 794,700.5',
    top: '794,586.5 838,560 906,599 862,624.5',
    right: '862,624.5 906,599 906,713.5 862,738.5',
    shadow: '862,738.5 906,713.5 906,679 963.5,707 902,740.5',
  },
  {
    code: 'C2', sourceTier: 'standard',
    front: '879,637.5 947,675.5 947,789.5 879,751.5',
    top: '879,637.5 923,611 991,650 947,675.5',
    right: '947,675.5 991,650 991,764.5 947,789.5',
    shadow: '947,789.5 991,764.5 991,730 1048.5,758 987,791.5',
  },
  {
    code: null, sourceTier: 'booked',
    front: '56,460.5 124,498.5 124,612.5 56,574.5',
    top: '56,460.5 100,434 168,473 124,498.5',
    right: '124,498.5 168,473 168,587.5 124,612.5',
    shadow: '124,612.5 168,587.5 168,553 225.5,581 164,614.5',
  },
  {
    code: 'C3', sourceTier: 'corner',
    front: '150,511.5 218,549.5 218,663.5 150,625.5',
    top: '150,511.5 194,485 262,524 218,549.5',
    right: '218,549.5 262,524 262,638.5 218,663.5',
    shadow: '218,663.5 262,638.5 262,604 319.5,632 258,665.5',
  },
  {
    code: 'C4', sourceTier: 'corner',
    front: '964,688.5 1032,726.5 1032,840.5 964,802.5',
    top: '964,688.5 1008,662 1076,701 1032,726.5',
    right: '1032,726.5 1076,701 1076,815.5 1032,840.5',
    shadow: '1032,840.5 1076,815.5 1076,781 1133.5,809 1072,842.5',
  },
  {
    code: 'D1', sourceTier: 'premium',
    front: '251,614 295,639 295,754 251,729',
    top: '251,614 337,564 379.5,590.5 295,639',
    right: '295,639 379.5,590.5 379.5,704.5 295,754',
    shadow: '295,754 379.5,704.5 379.5,670.5 437,698.285 341.5,754',
  },
  {
    code: 'D2', sourceTier: 'standard',
    front: '492,545.5 560,583.5 560,697.5 492,659.5',
    top: '492,545.5 536,519 604,558 560,583.5',
    right: '560,583.5 604,558 604,672.5 560,697.5',
    shadow: '560,697.5 604,672.5 604,638 661.5,666 600,699.5',
  },
  {
    code: 'B4', sourceTier: 'standard',
    front: '577,591.5 645,629.5 645,743.5 577,705.5',
    top: '577,591.5 621,565 689,604 645,629.5',
    right: '645,629.5 689,604 689,718.5 645,743.5',
    shadow: '645,743.5 689,718.5 689,684 746.5,712 685,745.5',
  },
  {
    code: null, sourceTier: 'booked',
    front: '671,642.5 739,680.5 739,794.5 671,756.5',
    top: '671,642.5 715,616 783,655 739,680.5',
    right: '739,680.5 783,655 783,769.5 739,794.5',
    shadow: '739,794.5 783,769.5 783,735 840.5,763 779,796.5',
  },
  {
    code: 'D3', sourceTier: 'standard',
    front: '761,695.5 829,733.5 829,847.5 761,809.5',
    top: '761,695.5 805,669 873,708 829,733.5',
    right: '829,733.5 873,708 873,822.5 829,847.5',
    shadow: '829,847.5 873,822.5 873,788 930.5,816 869,849.5',
  },
  {
    code: 'D4', sourceTier: 'corner',
    front: '850,748.5 918,786.5 918,900.5 850,862.5',
    top: '850,748.5 894,722 962,761 918,786.5',
    right: '918,786.5 962,761 962,875.5 918,900.5',
    shadow: '918,900.5 962,875.5 962,841 1019.5,869 958,902.5',
  },
]

const moneyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function PlazaMap({ stalls, selectedStallId, currentEventStallId, onSelect }: PlazaMapProps) {
  const [camera, setCamera] = useState<Camera>(initialCamera)
  const [dragging, setDragging] = useState(false)
  const drag = useRef({ active: false, moved: false, stallCode: null as string | null, x: 0, y: 0 })
  const inventory = useMemo(() => new Map(stalls.map((stall) => [stall.stallCode, stall])), [stalls])

  const zoomAt = (x: number, y: number, factor: number) => {
    setCamera((current) => {
      const scale = Math.max(0.6, Math.min(3, current.scale * factor))
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
    if (event.type !== 'pointerup' || moved || !stallCode) return

    const stall = inventory.get(stallCode)
    const isCurrent = stall?.eventStallId === currentEventStallId
    const isBooked = !stall || (Boolean(stall.bookingId) && !isCurrent)
    if (stall && !isBooked) onSelect(stall.eventStallId)
  }

  const handleWheel = (event: WheelEvent<SVGSVGElement>) => {
    event.preventDefault()
    const bounds = event.currentTarget.getBoundingClientRect()
    const renderedScale = bounds.width / viewBox.width
    const x = viewBox.x + (event.clientX - bounds.left) / renderedScale
    const y = viewBox.y + (event.clientY - bounds.top) / renderedScale
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
        preserveAspectRatio="xMidYMin meet"
        role="region"
        aria-label="Interactive three-dimensional plaza stall map"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        <defs>
          <linearGradient id="stall-front" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#f2f4ef" />
          </linearGradient>
          <linearGradient id="stall-top" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#f7f8f5" />
          </linearGradient>
          <linearGradient id="stall-right" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#eef0ec" />
            <stop offset="1" stopColor="#dfe3db" />
          </linearGradient>
        </defs>
        <rect x="0" y="300" width="1098" height="819" fill="#7c9c8a" />
        <g transform={`translate(${camera.x} ${camera.y}) scale(${camera.scale})`}>
          {backRoads.map((points) => <polygon key={points} points={points} fill="#fff" />)}
          {mapStalls.slice(0, 12).map((box, index) => (
            <StallShape
              key={box.code ?? `booked-${index}`}
              box={box}
              bookedNumber={index + 1}
              stall={box.code ? inventory.get(box.code) : undefined}
              selectedStallId={selectedStallId}
              currentEventStallId={currentEventStallId}
              onClick={chooseStall}
              onKeyDown={handleStallKeyDown}
            />
          ))}
          {middleRoads.map((points) => <polygon key={points} points={points} fill="#fff" />)}
          {mapStalls.slice(12).map((box, index) => (
            <StallShape
              key={box.code ?? `booked-${index + 12}`}
              box={box}
              bookedNumber={index + 13}
              stall={box.code ? inventory.get(box.code) : undefined}
              selectedStallId={selectedStallId}
              currentEventStallId={currentEventStallId}
              onClick={chooseStall}
              onKeyDown={handleStallKeyDown}
            />
          ))}
          <polygon points={parkingArea} fill="#d9d9d9" />
          <text className="plaza-map__parking-label" x="604" y="872" textAnchor="middle" transform="rotate(29 604 872)">
            Parking Area
          </text>
        </g>
      </svg>
      <div className="plaza-map__zoom" aria-label="Map zoom controls">
        <button type="button" onClick={() => zoomAt(549, 710, 1.25)} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => zoomAt(549, 710, 1 / 1.25)} aria-label="Zoom out">−</button>
        <button type="button" onClick={() => setCamera(initialCamera)}>Reset</button>
      </div>
    </>
  )
}

type StallShapeProps = {
  box: MapStall
  bookedNumber: number
  stall: PlazaMapStall | undefined
  selectedStallId: string
  currentEventStallId?: string | null
  onClick: (stall: PlazaMapStall | undefined, isBooked: boolean) => void
  onKeyDown: (event: KeyboardEvent<SVGGElement>, stall: PlazaMapStall | undefined, isBooked: boolean) => void
}

function StallShape({
  box,
  bookedNumber,
  stall,
  selectedStallId,
  currentEventStallId,
  onClick,
  onKeyDown,
}: StallShapeProps) {
  const isCurrent = stall?.eventStallId === currentEventStallId
  const isBooked = box.sourceTier === 'booked' || !stall || (Boolean(stall.bookingId) && !isCurrent)
  const isSelected = stall?.eventStallId === selectedStallId
  const tier = stall?.tier ?? (box.sourceTier === 'booked' ? 'standard' : box.sourceTier)
  const palette = isSelected ? palettes.selected : isBooked ? palettes.booked : palettes[tier]
  const state = isCurrent ? 'your current stall' : isBooked ? 'booked' : 'available'
  const label = stall
    ? `Stall ${stall.stallCode}, ${tier}, ${moneyFormatter.format(stall.priceCents / 100)}, ${state}`
    : `Booked stall location ${bookedNumber}`

  return (
    <g>
      <polygon className="plaza-map__shadow" points={box.shadow} />
      <g
        className="plaza-map__stall"
        role="button"
        tabIndex={0}
        aria-label={label}
        aria-disabled={isBooked}
        aria-pressed={isSelected}
        data-tier={tier}
        data-stall-code={box.code ?? undefined}
        onClick={() => onClick(stall, isBooked)}
        onKeyDown={(event) => onKeyDown(event, stall, isBooked)}
      >
        <title>{label}</title>
        <polygon points={box.front} fill={palette.front} stroke={palette.stroke} strokeWidth={palette.width} />
        <polygon points={box.top} fill={palette.top} stroke={palette.stroke} strokeWidth={palette.width} />
        <polygon points={box.right} fill={palette.right} stroke={palette.stroke} strokeWidth={palette.width} />
      </g>
    </g>
  )
}
