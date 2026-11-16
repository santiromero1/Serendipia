import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { create } from 'zustand'
import { X } from 'lucide-react'
import { Btn } from './bits'

const SEEN = 'serendipia.tour'

interface Step {
  route: string
  title: string
  body: string
}

const STEPS: Step[] = [
  { route: '/', title: 'Tu biblioteca', body: 'Todos tus temas de rekordbox con BPM, tonalidad y carpeta. A la izquierda filtrás por tonalidad, BPM, género o etiquetas. Un clic abre el detalle; el + suma el tema al set.' },
  { route: '/', title: 'Que Serendipia escuche tu música', body: 'Arriba a la derecha, “Analizar mi música”: elegís la carpeta donde están tus archivos (no el XML). Se analizan en tu navegador, nada se sube. Con eso se arma el mapa y podés escuchar.' },
  { route: '/mapa', title: 'El mapa', body: 'Cada punto es un tema; los que suenan parecido quedan cerca y forman grupos. El borde son los temas que no se parecen al resto. Clic en un tema muestra sus vecinos; clic en el centro de un grupo lo selecciona entero.' },
  { route: '/sets', title: 'Sets por capítulos', body: 'Un capítulo es un bloque de temas con la misma vibra. Empezás de cero o abrís una carpeta de rekordbox: cada playlist pasa a ser un capítulo. A la derecha, temas parecidos y los que pueden seguir.' },
  { route: '/sets', title: 'Ordenar sin chocar tonalidades', body: 'En Sets, pasá de “Capítulos” a “Orden”. Arrastrás los temas y cada paso muestra si la mezcla de tonalidades vale o choca. Marcá cuál abre, cuál es peak o cuáles van juntos, y Ordenar lo respeta.' },
  { route: '/consejos', title: 'Consejos', body: 'Temas que suenan más parecidos a los de otra carpeta que a los de donde están. Son pistas para escuchar y decidir, no correcciones.' },
  { route: '/sets', title: 'De vuelta a rekordbox', body: '“Exportar a rekordbox” baja un XML con una carpeta por set y una playlist por capítulo. Lo importás desde Preferencias › Avanzado › rekordbox xml. La guía completa está en el ícono de ayuda.' },
]

export const useTour = create<{ step: number | null; start: () => void; go: (n: number) => void; close: () => void }>((set) => ({
  step: null,
  start: () => set({ step: 0 }),
  go: (step) => set({ step }),
  close: () => {
    try {
      localStorage.setItem(SEEN, '1')
    } catch {
      /* sin almacenamiento */
    }
    set({ step: null })
  },
}))

/** Recorrido de primer uso: una tarjeta que va llevando por las secciones. */
export function Tour() {
  const { step, start, go, close } = useTour()
  const navigate = useNavigate()

  useEffect(() => {
    let seen = true
    try {
      seen = localStorage.getItem(SEEN) === '1'
    } catch {
      /* sin almacenamiento: no se muestra solo */
    }
    if (!seen) start()
  }, [start])

  useEffect(() => {
    if (step != null) navigate(STEPS[step].route)
  }, [step, navigate])

  if (step == null) return null
  const s = STEPS[step]
  const last = step === STEPS.length - 1
  return (
    <div role="dialog" aria-label="Recorrido" className="rise fixed bottom-20 left-[68px] z-40 w-[340px] rounded-[9px] border border-line-strong bg-raised p-4 shadow-[0_12px_40px_oklch(0_0_0/0.5)]">
      <div className="flex items-start justify-between gap-3">
        <span className="num text-[11px] text-faint">
          {step + 1} de {STEPS.length}
        </span>
        <button aria-label="Cerrar recorrido" onClick={close} className="-mr-1 -mt-1 grid h-6 w-6 place-items-center rounded-[4px] text-faint hover:bg-hover hover:text-fg">
          <X size={13} />
        </button>
      </div>
      <h2 className="mt-1 text-[14px] font-medium text-fg">{s.title}</h2>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-soft">{s.body}</p>
      <div className="mt-4 flex items-center justify-between">
        <Btn disabled={step === 0} onClick={() => go(step - 1)}>
          Anterior
        </Btn>
        <Btn variant="solid" onClick={() => (last ? close() : go(step + 1))}>
          {last ? 'Listo' : 'Siguiente'}
        </Btn>
      </div>
    </div>
  )
}
