import { useMemo } from 'react'
import { useLibrary } from '@/stores/library'
import { useSets } from '@/stores/sets'

/**
 * Abrir playlists de rekordbox como set: una carpeta da un capítulo por playlist,
 * una playlist sola da un set de un capítulo.
 */
export function FromRekordbox() {
  const playlists = useLibrary((s) => s.lib?.playlists ?? [])
  const createSetFrom = useSets((s) => s.createSetFrom)

  const folders = useMemo(() => {
    const m = new Map<string, { name: string; tracks: string[] }[]>()
    for (const p of playlists) {
      const i = p.name.lastIndexOf(' / ')
      const folder = i < 0 ? '' : p.name.slice(0, i)
      const list = m.get(folder) ?? []
      list.push({ name: i < 0 ? p.name : p.name.slice(i + 3), tracks: p.tracks })
      m.set(folder, list)
    }
    return [...m]
  }, [playlists])

  if (!playlists.length) return null

  const open = (value: string) => {
    const [kind, folder, name] = value.split('\u0000')
    const list = folders.find(([f]) => f === folder)?.[1] ?? []
    if (kind === 'folder') createSetFrom(folder.split(' / ').pop() || folder, list.map((p) => ({ name: p.name, trackIds: p.tracks })))
    else {
      const p = list.find((x) => x.name === name)
      if (p) createSetFrom(p.name, [{ name: p.name, trackIds: p.tracks }])
    }
  }

  return (
    <select
      aria-label="Abrir desde rekordbox"
      data-tour="sets-open"
      value=""
      onChange={(e) => e.target.value && open(e.target.value)}
      className="h-7 max-w-[220px] rounded-[5px] border border-line bg-transparent px-1.5 text-[12px] text-soft outline-none hover:border-line-strong hover:text-fg"
    >
      <option value="" className="bg-surface">
        Abrir desde rekordbox
      </option>
      {folders.map(([folder, list]) => (
        <optgroup key={folder || 'raiz'} label={folder || 'Sin carpeta'} className="bg-surface">
          {folder && list.length > 1 && (
            <option value={`folder\u0000${folder}\u0000`}>Toda la carpeta ({list.length} capítulos)</option>
          )}
          {list.map((p) => (
            <option key={p.name} value={`pl\u0000${folder}\u0000${p.name}`}>
              {p.name} · {p.tracks.length}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}
