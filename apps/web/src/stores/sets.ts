import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Mark, Marks } from '@/lib/types'

export interface Chapter {
  id: string
  name: string
  trackIds: string[]
}

export interface DJSet {
  id: string
  name: string
  chapters: Chapter[]
  /** marcas por tema, propias de este set */
  marks?: Marks
}

export const CHAPTER_PRESETS = ['Warm-up', 'Build-up', 'Peak', 'Cool-down', 'Closing']

const uid = () => Math.random().toString(36).slice(2, 10)
const chapter = (name: string, trackIds: string[] = []): Chapter => ({ id: uid(), name, trackIds })

interface SetsState {
  sets: DJSet[]
  activeSetId: string | null
  activeChapterId: string | null
  /** sugerencias descartadas, por set */
  dismissed: Record<string, string[]>

  createSet: (name: string, chapterNames?: string[]) => string
  /** set armado desde playlists de rekordbox; un tema puede repetirse entre capítulos */
  createSetFrom: (name: string, chapters: { name: string; trackIds: string[] }[]) => string
  renameSet: (id: string, name: string) => void
  deleteSet: (id: string) => void
  selectSet: (id: string) => void
  selectChapter: (id: string) => void
  addChapter: (name: string, trackIds?: string[]) => void
  renameChapter: (id: string, name: string) => void
  deleteChapter: (id: string) => void
  setChapterTracks: (id: string, trackIds: string[]) => void
  addTrack: (trackId: string, chapterId?: string, index?: number) => void
  removeTrack: (chapterId: string, trackId: string) => void
  dismiss: (trackId: string) => void
  /** cambia marcas de uno o varios temas en el set activo; un valor undefined borra esa marca */
  setMarks: (patch: Record<string, Partial<Mark>>) => void
}

export const useSets = create<SetsState>()(
  persist(
    (set, get) => {
      const patchActive = (fn: (s: DJSet) => DJSet) =>
        set((st) => ({ sets: st.sets.map((s) => (s.id === st.activeSetId ? fn(s) : s)) }))
      const patchChapter = (id: string, fn: (c: Chapter) => Chapter) =>
        patchActive((s) => ({ ...s, chapters: s.chapters.map((c) => (c.id === id ? fn(c) : c)) }))

      return {
        sets: [],
        activeSetId: null,
        activeChapterId: null,
        dismissed: {},

        createSet(name, chapterNames = CHAPTER_PRESETS) {
          const s: DJSet = { id: uid(), name, chapters: chapterNames.map((n) => chapter(n)) }
          set((st) => ({ sets: [...st.sets, s], activeSetId: s.id, activeChapterId: s.chapters[0]?.id ?? null }))
          return s.id
        },
        createSetFrom(name, chapters) {
          const s: DJSet = { id: uid(), name, chapters: chapters.map((c) => chapter(c.name, [...new Set(c.trackIds)])) }
          set((st) => ({ sets: [...st.sets, s], activeSetId: s.id, activeChapterId: s.chapters[0]?.id ?? null }))
          return s.id
        },
        renameSet: (id, name) => set((st) => ({ sets: st.sets.map((s) => (s.id === id ? { ...s, name } : s)) })),
        deleteSet: (id) =>
          set((st) => {
            const sets = st.sets.filter((s) => s.id !== id)
            const active = st.activeSetId === id ? (sets[0] ?? null) : st.sets.find((s) => s.id === st.activeSetId)
            return { sets, activeSetId: active?.id ?? null, activeChapterId: active?.chapters[0]?.id ?? null }
          }),
        selectSet: (id) =>
          set((st) => ({ activeSetId: id, activeChapterId: st.sets.find((s) => s.id === id)?.chapters[0]?.id ?? null })),
        selectChapter: (id) => set({ activeChapterId: id }),

        addChapter(name, trackIds = []) {
          if (!get().activeSetId) get().createSet('Set nuevo', [])
          const c = chapter(name, trackIds)
          const moved = new Set(trackIds)
          patchActive((s) => ({
            ...s,
            chapters: [...s.chapters.map((x) => ({ ...x, trackIds: x.trackIds.filter((t) => !moved.has(t)) })), c],
          }))
          set({ activeChapterId: c.id })
        },
        renameChapter: (id, name) => patchChapter(id, (c) => ({ ...c, name })),
        deleteChapter(id) {
          patchActive((s) => ({ ...s, chapters: s.chapters.filter((c) => c.id !== id) }))
          if (get().activeChapterId === id) {
            const s = get().sets.find((x) => x.id === get().activeSetId)
            set({ activeChapterId: s?.chapters[0]?.id ?? null })
          }
        },
        setChapterTracks: (id, trackIds) => patchChapter(id, (c) => ({ ...c, trackIds })),

        addTrack(trackId, chapterId, index) {
          if (!get().activeSetId) get().createSet('Set nuevo')
          const target = chapterId ?? get().activeChapterId
          if (!target) return
          // un tema vive en un solo capítulo del set: si ya estaba, se mueve
          patchActive((s) => ({
            ...s,
            chapters: s.chapters.map((c) => {
              const without = c.trackIds.filter((t) => t !== trackId)
              if (c.id !== target) return { ...c, trackIds: without }
              const at = index == null ? without.length : Math.min(index, without.length)
              return { ...c, trackIds: [...without.slice(0, at), trackId, ...without.slice(at)] }
            }),
          }))
        },
        removeTrack: (chapterId, trackId) =>
          patchChapter(chapterId, (c) => ({ ...c, trackIds: c.trackIds.filter((t) => t !== trackId) })),

        setMarks(patch) {
          patchActive((s) => {
            const marks: Marks = { ...s.marks }
            for (const [id, p] of Object.entries(patch)) {
              const next: Mark = { ...marks[id], ...p }
              for (const k of Object.keys(next) as (keyof Mark)[]) if (next[k] === undefined || next[k] === false || next[k] === '') delete next[k]
              if (Object.keys(next).length) marks[id] = next
              else delete marks[id]
            }
            return { ...s, marks }
          })
        },

        dismiss(trackId) {
          const id = get().activeSetId
          if (!id) return
          set((st) => ({ dismissed: { ...st.dismissed, [id]: [...(st.dismissed[id] ?? []), trackId] } }))
        },
      }
    },
    { name: 'serendipia.sets' },
  ),
)

export const useActiveSet = () => useSets((s) => s.sets.find((x) => x.id === s.activeSetId) ?? null)
