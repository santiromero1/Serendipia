import { useEffect, useLayoutEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { create } from 'zustand'
import { CircleHelp, X } from 'lucide-react'
import { useLibrary } from '@/stores/library'
import { Btn, cx } from './bits'

const SEEN = 'serendipia.tour.v2'

export type Screen = 'library' | 'map' | 'sets' | 'advice' | 'inbox'

interface Step {
  /** primer `data-tour` de la lista que exista en pantalla; si no hay ninguno, la tarjeta va centrada */
  target: string[]
  title: string
  body: string
}

const ROUTE: Record<Screen, string> = { library: '/', map: '/mapa', sets: '/sets', advice: '/consejos', inbox: '/bandeja' }
const NAME: Record<Screen, string> = { library: 'Biblioteca', map: 'Mapa', sets: 'Sets', advice: 'Consejos', inbox: 'Bandeja' }

const TOURS: Record<Screen, Step[]> = {
  library: [
    { target: ['nav'], title: 'Las secciones', body: 'Desde acá cambiás entre Biblioteca, Mapa, Sets y Consejos. Abajo están la ayuda y el botón para mostrar u ocultar los filtros.' },
    { target: ['library-actions'], title: 'Tu colección y tu música', body: '“Actualizar XML” vuelve a leer tu colección de rekordbox. “Analizar mi música” escucha tus archivos en este navegador para armar el mapa: elegís la carpeta de música, no el XML.' },
    { target: ['filters'], title: 'Filtros', body: 'La rueda filtra por tonalidad; debajo, BPM, energía, género, cajón y etiquetas. Valen también para el Mapa y para las sugerencias de Sets.' },
    { target: ['library-columns'], title: 'Ordenar la lista', body: 'Clic en una columna ordena por ese dato; otro clic invierte el orden.' },
    { target: ['library-list'], title: 'Los temas', body: 'Un clic abre el detalle con sus parecidos. Doble clic lo reproduce. El + que aparece a la derecha lo suma al capítulo activo de tu set.' },
    { target: ['player'], title: 'Reproductor', body: 'La forma de onda sirve para saltar. “Rápida” arranca en el cuerpo del tema en vez de la intro. La barra espaciadora pausa.' },
  ],
  map: [
    { target: ['map-canvas'], title: 'El mapa', body: 'Cada punto es un tema. Cerca significa que suenan parecido. El anillo de afuera son los temas que no se parecen al resto de tu colección.' },
    { target: ['map-controls'], title: 'Cómo mirarlo', body: '“Ejes” cambia a un gráfico donde elegís qué va en cada eje. “Color” pinta los puntos por tus carpetas, estilo detectado, energía o tonalidad. “Recorrido” dibuja tu set activo.' },
    { target: ['map-canvas'], title: 'Elegir temas', body: 'Clic en un punto muestra sus vecinos. Clic en el centro de un grupo lo selecciona entero. Shift + arrastrar selecciona una zona. De cualquier selección podés crear un capítulo.' },
    { target: ['filters'], title: 'Filtros en el mapa', body: 'Lo que filtres acá queda resaltado y el resto se apaga, sin perder de vista dónde está cada cosa.' },
  ],
  sets: [
    { target: ['sets-open', 'sets-empty'], title: 'Empezar un set', body: 'Arrancás de cero o abrís una carpeta de rekordbox: cada playlist pasa a ser un capítulo.' },
    { target: ['sets-chapters', 'sets-empty'], title: 'Capítulos', body: 'Cada fila es un bloque de temas con la misma vibra. Entre tema y tema ves si la mezcla de tonalidades vale o choca. Arrastrá temas entre filas.' },
    { target: ['sets-explorer', 'sets-empty'], title: 'Explorador', body: '“Parecidos” sugiere lo que más se parece al capítulo activo. “Siguiente”, lo que puede seguir al último tema por tonalidad y BPM. “Buscar” usa los filtros.' },
    { target: ['sets-view', 'sets-empty'], title: 'Vista Orden', body: 'Pasa a una lista para ordenar con precisión: arrastrás, ves cada alerta de tonalidad, y marcás qué tema abre, cuál es peak o cuáles van juntos. Ordenar respeta esas marcas.' },
    { target: ['sets-export', 'sets-empty'], title: 'De vuelta a rekordbox', body: 'Baja un XML con una carpeta por set y una playlist por capítulo. Cmd + Z deshace el último cambio.' },
  ],
  advice: [
    { target: ['advice-list'], title: 'Consejos', body: 'Temas que suenan más parecidos a los de otra carpeta o cajón que a los de donde están. “Ver cuáles” muestra los temas que lo justifican; “Está bien ahí” lo descarta.' },
  ],
  inbox: [
    { target: ['inbox-list'], title: 'Bandeja de descargas', body: 'Por cada tema nuevo: hasta tres cajones sugeridos, el nombre propuesto y aviso de duplicados. Con 1, 2, 3 elegís destino y Enter lo mueve. Nada se mueve sin que lo confirmes.' },
  ],
}

interface TourState {
  /** pantallas por recorrer y posición actual */
  screens: Screen[]
  s: number
  i: number
  active: boolean
  start: () => void
  startScreen: (screen: Screen) => void
  next: () => void
  prev: () => void
  close: () => void
}

export const useTour = create<TourState>((set, get) => ({
  screens: [],
  s: 0,
  i: 0,
  active: false,
  start: () => set({ screens: (['library', 'map', 'sets', 'advice', 'inbox'] as Screen[]).filter((x) => x !== 'inbox' || useLibrary.getState().hasServer), s: 0, i: 0, active: true }),
  startScreen: (screen) => set({ screens: [screen], s: 0, i: 0, active: true }),
  next() {
    const { screens, s, i } = get()
    if (i + 1 < TOURS[screens[s]].length) set({ i: i + 1 })
    else if (s + 1 < screens.length) set({ s: s + 1, i: 0 })
    else get().close()
  },
  prev() {
    const { screens, s, i } = get()
    if (i > 0) set({ i: i - 1 })
    else if (s > 0) set({ s: s - 1, i: TOURS[screens[s - 1]].length - 1 })
  },
  close() {
    try {
      localStorage.setItem(SEEN, '1')
    } catch {
      /* sin almacenamiento */
    }
    set({ active: false })
  },
}))

/** Botón para repetir el recorrido de una pantalla. */
export function TourButton({ screen }: { screen: Screen }) {
  const startScreen = useTour((s) => s.startScreen)
  return (
    <button
      aria-label={`Recorrido de ${NAME[screen]}`}
      title={`Recorrido de ${NAME[screen]}`}
      onClick={() => startScreen(screen)}
      className="grid h-6 w-6 shrink-0 place-items-center rounded-[4px] text-faint hover:bg-raised hover:text-fg"
    >
      <CircleHelp size={14} strokeWidth={1.6} />
    </button>
  )
}

interface Box {
  x: number
  y: number
  w: number
  h: number
}
const PAD = 6
const CARD_W = 340

/** Recorrido que resalta una parte de la pantalla por vez y explica qué hace. */
export function Tour() {
  const { screens, s, i, active, start, next, prev, close } = useTour()
  const navigate = useNavigate()
  const [box, setBox] = useState<Box | null>(null)
  const screen = screens[s]
  const step = active && screen ? TOURS[screen][i] : null

  useEffect(() => {
    let seen = true
    try {
      seen = localStorage.getItem(SEEN) === '1'
    } catch {
      /* sin almacenamiento: no arranca solo */
    }
    if (!seen) start()
  }, [start])

  useEffect(() => {
    if (active && screen) navigate(ROUTE[screen])
  }, [active, screen, navigate])

  // ubica el elemento resaltado; se reintenta un momento porque la pantalla puede estar cambiando
  useLayoutEffect(() => {
    if (!step) return setBox(null)
    let tries = 0
    let timer = 0
    const measure = () => {
      const el = step.target.map((t) => document.querySelector<HTMLElement>(`[data-tour="${t}"]`)).find((e) => e && e.offsetParent !== null)
      if (!el && tries++ < 12) return void (timer = window.setTimeout(measure, 80))
      if (!el) return setBox(null)
      const r = el.getBoundingClientRect()
      setBox({ x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('resize', measure)
    }
  }, [step, screen])

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') next()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'Escape') close()
      else return
      e.stopPropagation()
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [active, next, prev, close])

  if (!step) return null
  const vw = window.innerWidth
  const vh = window.innerHeight
  const total = TOURS[screen].length
  const last = s === screens.length - 1 && i === total - 1
  const first = s === 0 && i === 0

  // la tarjeta va al lado del resaltado donde haya lugar; si el resaltado es enorme, adentro
  let left = vw / 2 - CARD_W / 2
  let top = vh / 2 - 110
  if (box) {
    const room = { right: vw - (box.x + box.w), left: box.x, below: vh - (box.y + box.h), above: box.y }
    if (room.right >= CARD_W + 28) [left, top] = [box.x + box.w + 14, box.y]
    else if (room.left >= CARD_W + 28) [left, top] = [box.x - CARD_W - 14, box.y]
    else if (room.below >= 230) [left, top] = [box.x, box.y + box.h + 14]
    else if (room.above >= 230) [left, top] = [box.x, box.y - 224]
    else [left, top] = [box.x + box.w - CARD_W - 24, box.y + 24]
    left = Math.max(12, Math.min(left, vw - CARD_W - 12))
    top = Math.max(12, Math.min(top, vh - 236))
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-label={`Recorrido de ${NAME[screen]}`}>
      {/* el oscurecido es la sombra del recuadro: deja a la vista solo la parte resaltada */}
      <div
        className={cx('pointer-events-none absolute rounded-[8px] border border-fg/70 transition-all duration-300 ease-out', !box && 'border-transparent')}
        style={
          box
            ? { left: box.x, top: box.y, width: box.w, height: box.h, boxShadow: '0 0 0 9999px oklch(0.1 0.004 260 / 0.72)' }
            : { left: vw / 2, top: vh / 2, width: 0, height: 0, boxShadow: '0 0 0 9999px oklch(0.1 0.004 260 / 0.72)' }
        }
      />
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />
      <div className="absolute rounded-[9px] border border-line-strong bg-raised p-4 shadow-[0_12px_40px_oklch(0_0_0/0.5)] transition-all duration-300 ease-out" style={{ left, top, width: CARD_W }}>
        <div className="flex items-start justify-between gap-3">
          <span className="text-[11px] text-faint">
            {NAME[screen]} <span className="num">· {i + 1} de {total}</span>
            {screens.length > 1 && <span className="num text-ghost"> · pantalla {s + 1} de {screens.length}</span>}
          </span>
          <button aria-label="Cerrar recorrido" onClick={close} className="-mr-1 -mt-1 grid h-6 w-6 place-items-center rounded-[4px] text-faint hover:bg-hover hover:text-fg">
            <X size={13} />
          </button>
        </div>
        <h2 className="mt-1 text-[14px] font-medium text-fg">{step.title}</h2>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-soft">{step.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <Btn disabled={first} onClick={prev}>
            Anterior
          </Btn>
          <Btn variant="solid" onClick={next}>
            {last ? 'Listo' : i === total - 1 ? `Seguir con ${NAME[screens[s + 1]]}` : 'Siguiente'}
          </Btn>
        </div>
      </div>
    </div>
  )
}
