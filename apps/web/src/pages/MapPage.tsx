import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { Cluster, Track } from '@/lib/types'
import { keyColor } from '@/lib/harmony'
import { neighbors } from '@/lib/similarity'
import { Btn, Chips, Cover, cx, Segmented, Select } from '@/components/bits'
import { matchesFilters, useFilters } from '@/stores/filters'
import { useLibrary } from '@/stores/library'
import { usePlayer } from '@/stores/player'
import { useActiveSet, useSets } from '@/stores/sets'
import { useUI } from '@/stores/ui'

type Axis = 'energy' | 'dance' | 'bright' | 'bpm'
type ColorBy = 'mono' | 'genre' | 'style' | 'energy' | 'key'

const AXES: { value: Axis; label: string }[] = [
  { value: 'energy', label: 'Energía' },
  { value: 'dance', label: 'Bailabilidad' },
  { value: 'bright', label: 'Brillo' },
  { value: 'bpm', label: 'BPM' },
]
const AXIS_ENDS: Record<Axis, [string, string]> = {
  energy: ['tranqui', 'arriba'],
  dance: ['suelto', 'bailable'],
  bright: ['oscuro', 'brillante'],
  bpm: ['105', '135'],
}
const PAD = 56
const SILVER = 'oklch(0.9 0.006 260)'
const GHOST = 'oklch(0.42 0.007 260)'
const hueColor = (i: number) => `oklch(0.76 0.1 ${(i * 137.5 + 210) % 360})`

/** Ruido fijo por tema para separar puntos con el mismo valor entero (BPM). */
const jitter = (id: string) => (parseInt(id.slice(0, 4), 16) / 0xffff - 0.5) * 0.02

function axisValue(t: Track, a: Axis): number | null {
  if (a === 'bpm') return t.bpm == null ? null : Math.max(0, Math.min(1, (t.bpm - 105) / 30)) + jitter(t.id)
  const v = t[a]
  return v == null ? null : (v - 1) / 9
}

export function MapPage() {
  const tracks = useLibrary((s) => s.tracks)
  const lib = useLibrary((s) => s.lib)
  const filters = useFilters()
  const toggleFilter = useFilters((s) => s.toggle)
  const selectedId = useUI((s) => s.selectedId)
  const select = useUI((s) => s.select)
  const play = usePlayer((s) => s.play)
  const addChapter = useSets((s) => s.addChapter)

  const clusters = useMemo(() => lib?.clusters ?? [], [lib])
  const hasGalaxy = clusters.length > 0

  const [mode, setMode] = useState<'near' | 'axes'>('near')
  const [xAxis, setXAxis] = useState<Axis>('bright')
  const [yAxis, setYAxis] = useState<Axis>('energy')
  const [colorBy, setColorBy] = useState<ColorBy>(hasGalaxy ? 'mono' : 'genre')
  const [hover, setHover] = useState<{ track: Track; x: number; y: number } | null>(null)
  const [hoverHub, setHoverHub] = useState<number | null>(null)
  const [picked, setPicked] = useState<{ ids: string[]; name: string | null }>({ ids: [], name: null })
  const [box, setBox] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [made, setMade] = useState<string | null>(null)
  const [showSet, setShowSet] = useState(false)
  const activeSet = useActiveSet()
  /** recorrido del set activo: sus temas en orden, capítulo por capítulo, sin los extras */
  const route = useMemo(
    () => (activeSet?.chapters ?? []).flatMap((c) => c.trackIds.filter((id) => !activeSet?.marks?.[id]?.extra)),
    [activeSet],
  )
  const routeOn = showSet && route.length > 1

  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const transform = useRef(d3.zoomIdentity)
  const pos = useRef(new Map<string, [number, number]>())
  const raf = useRef(0)

  const genres = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of tracks) m.set(t.genre, (m.get(t.genre) ?? 0) + 1)
    return [...m].sort((a, b) => b[1] - a[1]).map(([g]) => g)
  }, [tracks])
  const styles = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of tracks) if (t.style) m.set(t.style, (m.get(t.style) ?? 0) + 1)
    return [...m].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([s]) => s)
  }, [tracks])

  const colorOf = useCallback(
    (t: Track) => {
      if (colorBy === 'mono') return SILVER
      if (colorBy === 'key') return keyColor(t.key)
      if (colorBy === 'energy') return t.energy == null ? GHOST : `oklch(${0.38 + t.energy * 0.058} ${0.01 + t.energy * 0.006} 225)`
      if (colorBy === 'style') {
        const i = t.style ? styles.indexOf(t.style) : -1
        return i < 0 ? GHOST : hueColor(i)
      }
      return hueColor(genres.indexOf(t.genre))
    },
    [colorBy, genres, styles],
  )

  const byId = useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks])
  const visible = useMemo(() => new Set(tracks.filter((t) => matchesFilters(t, filters)).map((t) => t.id)), [tracks, filters])
  const selected = selectedId ? byId.get(selectedId) : undefined
  const near = useMemo(() => (selected ? neighbors(selected, tracks, 8).map((s) => s.track.id) : []), [selected, tracks])

  const target = useMemo(() => {
    const m = new Map<string, [number, number]>()
    for (const t of tracks) {
      if (mode === 'near') {
        if (t.x != null && t.y != null) m.set(t.id, [t.x, t.y])
      } else {
        const x = axisValue(t, xAxis)
        const y = axisValue(t, yAxis)
        if (x != null && y != null) m.set(t.id, [x, 1 - y])
      }
    }
    return m
  }, [tracks, mode, xAxis, yAxis])

  /** La galaxia es un disco: misma escala en los dos ejes. Los ejes usan todo el rectángulo. */
  const toScreen = useCallback(
    (p: [number, number]): [number, number] => {
      const t = transform.current
      if (mode === 'near') {
        const side = Math.min(size.w, size.h) - PAD
        return [t.applyX(size.w / 2 + (p[0] - 0.5) * side), t.applyY(size.h / 2 + (p[1] - 0.5) * side)]
      }
      return [t.applyX(PAD + p[0] * (size.w - PAD * 2)), t.applyY(PAD + p[1] * (size.h - PAD * 2))]
    },
    [size, mode],
  )

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size.w, size.h)
    const k = transform.current.k
    const r = Math.max(1.9, Math.min(6.5, 2.3 * Math.sqrt(k)))
    const pickedSet = new Set(picked.ids)
    const nearSet = new Set(near)
    const galaxy = mode === 'near' && hasGalaxy
    const routeSet = new Set(routeOn ? route : [])
    const focus = selectedId != null || hoverHub != null || routeOn
    const inFocus = (t: Track) => t.id === selectedId || nearSet.has(t.id) || (hoverHub != null && t.cluster === hoverHub) || routeSet.has(t.id)

    if (galaxy) {
      // red tenue: rayos al centro de cada grupo y uniones entre vecinos mutuos
      ctx.lineWidth = 0.6
      ctx.strokeStyle = 'oklch(0.9 0.006 260)'
      ctx.beginPath()
      for (const t of tracks) {
        const p = pos.current.get(t.id)
        if (!p || !visible.has(t.id)) continue
        const [x, y] = toScreen(p)
        const hub = t.cluster != null ? clusters[t.cluster] : null
        if (hub) {
          const [hx, hy] = toScreen([hub.x, hub.y])
          ctx.moveTo(x, y)
          ctx.lineTo(hx, hy)
        }
        for (const id of t.nn ?? []) {
          if (id < t.id || !visible.has(id)) continue
          const q = pos.current.get(id)
          if (!q) continue
          const [qx, qy] = toScreen(q)
          ctx.moveTo(x, y)
          ctx.lineTo(qx, qy)
        }
      }
      ctx.globalAlpha = focus ? 0.035 : 0.075
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    const sel = selectedId ? pos.current.get(selectedId) : undefined
    if (sel) {
      const [sx, sy] = toScreen(sel)
      ctx.strokeStyle = 'oklch(0.965 0.003 260 / 0.5)'
      ctx.lineWidth = 1
      for (const id of near) {
        const p = pos.current.get(id)
        if (!p) continue
        const [x, y] = toScreen(p)
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(x, y)
        ctx.stroke()
      }
    }

    if (routeOn) {
      // el set como camino: de dónde sale, por dónde pasa y cuánto salta entre zonas
      const pts = route.map((id) => pos.current.get(id)).filter((p): p is [number, number] => !!p).map(toScreen)
      ctx.strokeStyle = 'oklch(0.87 0.045 225)'
      ctx.lineWidth = 1.4
      ctx.lineJoin = 'round'
      ctx.globalAlpha = 0.85
      ctx.beginPath()
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.fillStyle = 'oklch(0.87 0.045 225)'
      ctx.font = '500 10px Geist Mono, ui-monospace, monospace'
      ctx.textAlign = 'left'
      pts.forEach(([x, y], i) => {
        if (i === 0 || i === pts.length - 1 || k > 2.2) ctx.fillText(String(i + 1), x + 6, y - 6)
      })
    }

    // primero los apagados, después los activos, para que no los tapen
    for (const pass of [0, 1]) {
      for (const t of tracks) {
        const p = pos.current.get(t.id)
        if (!p) continue
        const on = visible.has(t.id)
        if ((pass === 1) !== on) continue
        const [x, y] = toScreen(p)
        if (x < -10 || y < -10 || x > size.w + 10 || y > size.h + 10) continue
        const emphasis = inFocus(t) || pickedSet.has(t.id)
        ctx.globalAlpha = on ? (focus && !emphasis ? 0.28 : 0.95) : 0.08
        ctx.fillStyle = colorOf(t)
        ctx.beginPath()
        ctx.arc(x, y, emphasis ? r + 1.2 : r, 0, Math.PI * 2)
        ctx.fill()
        if (t.id === selectedId || pickedSet.has(t.id)) {
          ctx.globalAlpha = 1
          ctx.strokeStyle = 'oklch(0.965 0.003 260)'
          ctx.lineWidth = 1.25
          ctx.beginPath()
          ctx.arc(x, y, r + 3.5, 0, Math.PI * 2)
          ctx.stroke()
        }
      }
    }

    if (galaxy) {
      ctx.textAlign = 'center'
      ctx.font = `500 ${Math.min(13, 10.5 + k * 0.6)}px Geist, system-ui, sans-serif`
      for (const c of clusters) {
        const [x, y] = toScreen([c.x, c.y])
        const hot = hoverHub === c.id || (selected && selected.cluster === c.id)
        const hr = Math.max(4, Math.min(12, (2.6 + Math.sqrt(c.n) * 0.42) * Math.sqrt(k)))
        ctx.globalAlpha = focus && !hot ? 0.35 : 1
        ctx.fillStyle = 'oklch(0.145 0.004 260)'
        ctx.beginPath()
        ctx.arc(x, y, hr + 2.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'oklch(0.985 0.002 260)'
        ctx.beginPath()
        ctx.arc(x, y, hr, 0, Math.PI * 2)
        ctx.fill()
        ctx.lineWidth = 3
        ctx.strokeStyle = 'oklch(0.145 0.004 260 / 0.85)'
        ctx.strokeText(c.label, x, y + hr + 14)
        ctx.fillStyle = hot ? 'oklch(0.985 0.002 260)' : 'oklch(0.76 0.006 260)'
        ctx.fillText(c.label, x, y + hr + 14)
      }
      ctx.globalAlpha = 1
    }
  }, [tracks, visible, size, selectedId, selected, near, picked, colorOf, toScreen, mode, hasGalaxy, clusters, hoverHub, routeOn, route])

  // tamaño del lienzo
  useEffect(() => {
    const el = wrapRef.current!
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useEffect(() => {
    const c = canvasRef.current!
    const dpr = window.devicePixelRatio || 1
    c.width = size.w * dpr
    c.height = size.h * dpr
  }, [size])

  // zoom y paneo; con Shift el arrastre selecciona una zona
  useEffect(() => {
    const zoom = d3
      .zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.7, 14])
      .filter((e) => !e.shiftKey && (e.type === 'wheel' || !e.button))
      .on('zoom', (e) => {
        transform.current = e.transform
        setHover(null)
        draw()
      })
    const s = d3.select(canvasRef.current!)
    s.call(zoom).on('dblclick.zoom', null)
    return () => void s.on('.zoom', null)
  }, [draw])

  // transición entre disposiciones
  useEffect(() => {
    cancelAnimationFrame(raf.current)
    const from = new Map(pos.current)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t0 = performance.now()
    const step = (now: number) => {
      const k = reduce || !from.size ? 1 : Math.min(1, (now - t0) / 520)
      const e = 1 - Math.pow(1 - k, 4)
      const next = new Map<string, [number, number]>()
      for (const [id, p] of target) {
        const f = from.get(id) ?? p
        next.set(id, [f[0] + (p[0] - f[0]) * e, f[1] + (p[1] - f[1]) * e])
      }
      pos.current = next
      draw()
      if (k < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
    // draw cambia con filtros y selección; esas actualizaciones las cubre el efecto de abajo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])
  useEffect(draw, [draw])

  const hit = (mx: number, my: number): Track | null => {
    let best: Track | null = null
    let bd = 12 * 12
    for (const t of tracks) {
      const p = pos.current.get(t.id)
      if (!p || !visible.has(t.id)) continue
      const [x, y] = toScreen(p)
      const d = (x - mx) ** 2 + (y - my) ** 2
      if (d < bd) {
        bd = d
        best = t
      }
    }
    return best
  }
  const hitHub = (mx: number, my: number): Cluster | null => {
    if (mode !== 'near') return null
    for (const c of clusters) {
      const [x, y] = toScreen([c.x, c.y])
      if ((x - mx) ** 2 + (y - my) ** 2 < 11 * 11) return c
    }
    return null
  }
  const local = (e: React.PointerEvent | React.MouseEvent) => {
    const r = canvasRef.current!.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top] as const
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (!e.shiftKey) return
    const [x, y] = local(e)
    setBox({ x0: x, y0: y, x1: x, y1: y })
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const [x, y] = local(e)
    if (box) return setBox({ ...box, x1: x, y1: y })
    const hub = hitHub(x, y)
    setHoverHub(hub ? hub.id : null)
    if (hub) return setHover(null)
    const t = hit(x, y)
    if (!t) return setHover(null)
    const [sx, sy] = toScreen(pos.current.get(t.id)!)
    setHover({ track: t, x: sx, y: sy })
  }
  const onPointerUp = () => {
    if (!box) return
    const [xa, xb] = [Math.min(box.x0, box.x1), Math.max(box.x0, box.x1)]
    const [ya, yb] = [Math.min(box.y0, box.y1), Math.max(box.y0, box.y1)]
    const ids = tracks
      .filter((t) => {
        const p = pos.current.get(t.id)
        if (!p || !visible.has(t.id)) return false
        const [x, y] = toScreen(p)
        return x >= xa && x <= xb && y >= ya && y <= yb
      })
      .map((t) => t.id)
    setPicked({ ids, name: null })
    setBox(null)
  }

  const missing = tracks.length - target.size
  const report = lib?.galaxy
  const legend = colorBy === 'genre' ? genres : colorBy === 'style' ? styles : null

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-11 shrink-0 items-center gap-3 px-5">
        <h1 className="text-[14px] font-medium text-fg">Mapa</h1>
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'near', label: hasGalaxy ? 'Galaxia' : 'Cercanía' },
            { value: 'axes', label: 'Ejes' },
          ]}
        />
        {mode === 'axes' && (
          <>
            <Select label="X" value={xAxis} options={AXES} onChange={setXAxis} />
            <Select label="Y" value={yAxis} options={AXES} onChange={setYAxis} />
          </>
        )}
        <Select
          label="Color"
          value={colorBy}
          onChange={setColorBy}
          options={[
            { value: 'mono', label: 'Sin color' },
            { value: 'genre', label: 'Mis carpetas' },
            ...(styles.length ? [{ value: 'style' as const, label: 'Estilo detectado' }] : []),
            { value: 'energy', label: 'Energía' },
            { value: 'key', label: 'Tonalidad' },
          ]}
        />
        {activeSet && route.length > 1 && (
          <button
            aria-pressed={showSet}
            onClick={() => setShowSet(!showSet)}
            title="Dibuja el recorrido del set activo sobre el mapa"
            className={cx('h-7 max-w-[220px] shrink-0 truncate rounded-[5px] border px-2.5 text-[12px] transition-colors', showSet ? 'border-signal text-signal' : 'border-line text-soft hover:border-line-strong hover:text-fg')}
          >
            Recorrido: {activeSet.name}
          </button>
        )}
        <span className="ml-auto truncate text-[11.5px] text-faint">
          {mode === 'near' && hasGalaxy && report
            ? `Ubicados por sonido y tags, sin tus carpetas: ${report.genero.conTags ?? report.genero.huella}% de los vecinos de cada tema está en tu misma carpeta.`
            : 'Shift + arrastrar selecciona una zona.'}
          {missing > 0 && ` ${missing} temas sin análisis no aparecen.`}
        </span>
      </header>

      <div ref={wrapRef} className="relative min-h-0 flex-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          style={{ width: size.w, height: size.h }}
          className={cx('block', hover || hoverHub != null ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing')}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={() => {
            setHover(null)
            setHoverHub(null)
          }}
          onClick={(e) => {
            if (e.shiftKey) return
            const [x, y] = local(e)
            const hub = hitHub(x, y)
            if (hub) {
              setPicked({ ids: tracks.filter((t) => t.cluster === hub.id && visible.has(t.id)).map((t) => t.id), name: hub.label })
              return
            }
            const t = hit(x, y)
            select(t ? t.id : null)
          }}
          onDoubleClick={(e) => {
            const t = hit(...local(e))
            if (t) play(t.id)
          }}
        />

        {mode === 'near' && hasGalaxy && (
          <p className="label pointer-events-none absolute bottom-3 left-5 normal-case tracking-normal">
            Centro: el núcleo de tu sonido · Borde: temas que no se parecen al resto · Clic en un grupo lo selecciona
          </p>
        )}

        {mode === 'axes' && (
          <>
            <div className="label pointer-events-none absolute inset-x-0 bottom-3 flex justify-between px-14">
              <span>{AXIS_ENDS[xAxis][0]}</span>
              <span className="text-soft">{AXES.find((a) => a.value === xAxis)!.label}</span>
              <span>{AXIS_ENDS[xAxis][1]}</span>
            </div>
            <div className="label pointer-events-none absolute bottom-14 left-3 top-14 flex flex-col-reverse items-center justify-between">
              <span className="rotate-180 [writing-mode:vertical-rl]">{AXIS_ENDS[yAxis][0]}</span>
              <span className="rotate-180 text-soft [writing-mode:vertical-rl]">{AXES.find((a) => a.value === yAxis)!.label}</span>
              <span className="rotate-180 [writing-mode:vertical-rl]">{AXIS_ENDS[yAxis][1]}</span>
            </div>
          </>
        )}

        {box && (
          <div
            className="pointer-events-none absolute border border-fg/60 bg-fg/5"
            style={{ left: Math.min(box.x0, box.x1), top: Math.min(box.y0, box.y1), width: Math.abs(box.x1 - box.x0), height: Math.abs(box.y1 - box.y0) }}
          />
        )}

        {hover && (
          <div
            className="pointer-events-none absolute z-10 flex w-[240px] items-center gap-2.5 rounded-[6px] border border-line-strong bg-surface p-2"
            style={{ left: Math.min(hover.x + 14, size.w - 252), top: Math.min(hover.y + 14, size.h - 70) }}
          >
            <Cover track={hover.track} size={40} />
            <div className="min-w-0">
              <div className="truncate text-[12.5px] text-fg">{hover.track.title}</div>
              <div className="truncate text-[11.5px] text-faint">{hover.track.artist}</div>
              <div className="mt-0.5 flex items-center gap-2">
                <Chips track={hover.track} />
              </div>
              <div className="truncate text-[11px] text-ghost">
                {hover.track.genre}
                {hover.track.crate && ` · ${hover.track.crate}`}
                {hover.track.style && ` · suena a ${hover.track.style}`}
              </div>
            </div>
          </div>
        )}

        {legend && (
          <ul className="absolute right-3 top-2 space-y-0.5 rounded-[6px] bg-bg/80 p-2">
            {legend.map((g, i) => {
              const on = colorBy === 'genre' && filters.genres.includes(g)
              return (
                <li key={g}>
                  <button
                    onClick={() => colorBy === 'genre' && toggleFilter('genres', g)}
                    aria-pressed={colorBy === 'genre' ? on : undefined}
                    className={cx(
                      'flex items-center gap-2 text-[11.5px]',
                      colorBy === 'genre' ? 'hover:text-fg' : 'cursor-default',
                      on ? 'text-fg' : colorBy === 'genre' && filters.genres.length ? 'text-ghost' : 'text-soft',
                    )}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: hueColor(i) }} />
                    {g}
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {(picked.ids.length > 0 || made) && (
          <div className="rise absolute bottom-10 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-[7px] border border-line-strong bg-surface py-1.5 pl-3 pr-1.5">
            {made ? (
              <span className="pr-2 text-[12px] text-fg">Capítulo “{made}” creado en Sets.</span>
            ) : (
              <>
                <span className="text-[12px] text-fg">
                  <span className="num">{picked.ids.length}</span> temas {picked.name ? `en “${picked.name}”` : 'en la zona'}
                </span>
                <Btn
                  variant="solid"
                  onClick={() => {
                    const name = picked.name ?? `Zona ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`
                    addChapter(name, picked.ids)
                    setPicked({ ids: [], name: null })
                    setMade(name)
                    setTimeout(() => setMade(null), 2600)
                  }}
                >
                  Crear capítulo
                </Btn>
                <Btn onClick={() => setPicked({ ids: [], name: null })}>Soltar</Btn>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
