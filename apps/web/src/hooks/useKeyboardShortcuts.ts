import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '@/stores/ui'

function isTyping(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable
}

/** Atajos globales — CKM/3-design.md §6. */
export function useKeyboardShortcuts() {
  const navigate = useNavigate()
  const ui = useUIStore()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey

      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        useUIStore.getState().setSearchOpen(true)
        return
      }
      if (mod && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        useUIStore.getState().openAddTrack()
        return
      }
      if (mod && e.key.toLowerCase() === 'i') {
        e.preventDefault()
        useUIStore.getState().setImportOpen(true)
        return
      }

      if (e.key === 'Escape') {
        const s = useUIStore.getState()
        if (s.searchOpen) s.setSearchOpen(false)
        else if (s.importOpen) s.setImportOpen(false)
        else if (s.newPlaylistOpen) s.setNewPlaylistOpen(false)
        else if (s.panel.type !== 'none') s.closePanel()
        return
      }

      // teclas simples: solo si no estás escribiendo y sin modificadores
      if (mod || isTyping(e.target)) return
      const k = e.key.toLowerCase()
      if (k === 'g') navigate('/graph')
      else if (k === 'l') useUIStore.getState().setLibraryView('list')
      else if (k === 'b') useUIStore.getState().setLibraryView('grid')
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate])

  return ui
}
