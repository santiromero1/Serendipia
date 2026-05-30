import { Disc3, Upload, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useUIStore } from '@/stores/ui'

export function EmptyState() {
  const openAdd = useUIStore((s) => s.openAddTrack)
  const setImport = useUIStore((s) => s.setImportOpen)

  return (
    <div className="flex flex-col items-center justify-center gap-5 py-24 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-border bg-surface text-primary shadow-glow-purple">
        <Disc3 size={36} />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold text-fg">Tu biblioteca está vacía</h2>
        <p className="max-w-sm text-sm text-fg-soft">
          Importá tu biblioteca de Rekordbox o agregá tu primer track para empezar a construir tu segundo cerebro.
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => setImport(true)}>
          <Upload size={16} /> Importar desde Rekordbox
        </Button>
        <Button onClick={openAdd}>
          <Plus size={16} /> Agregar Track
        </Button>
      </div>
    </div>
  )
}
