import { create } from 'zustand'

const audio = typeof Audio !== 'undefined' ? new Audio() : null
if (audio) audio.preload = 'metadata'

interface PlayerState {
  trackId: string | null
  playing: boolean
  time: number
  duration: number
  /** escucha rápida: arranca en el cuerpo del tema, no en la intro */
  fastPreview: boolean
  error: string | null
  play: (id: string) => void
  toggle: () => void
  seek: (fraction: number) => void
  setFastPreview: (v: boolean) => void
}

export const usePlayer = create<PlayerState>((set, get) => {
  if (audio) {
    audio.addEventListener('timeupdate', () => set({ time: audio.currentTime }))
    audio.addEventListener('durationchange', () => set({ duration: audio.duration || 0 }))
    audio.addEventListener('play', () => set({ playing: true, error: null }))
    audio.addEventListener('pause', () => set({ playing: false }))
    audio.addEventListener('ended', () => set({ playing: false }))
    audio.addEventListener('error', () => set({ playing: false, error: 'No se pudo reproducir el archivo' }))
  }
  return {
    trackId: null,
    playing: false,
    time: 0,
    duration: 0,
    fastPreview: true,
    error: null,

    play(id) {
      if (!audio) return
      if (get().trackId === id) {
        get().toggle()
        return
      }
      set({ trackId: id, time: 0, duration: 0, error: null })
      audio.src = `/audio/${id}`
      if (get().fastPreview) {
        audio.addEventListener(
          'loadedmetadata',
          () => {
            if (Number.isFinite(audio.duration)) audio.currentTime = audio.duration * 0.35
          },
          { once: true },
        )
      }
      audio.play().catch(() => set({ playing: false }))
    },

    toggle() {
      if (!audio || !get().trackId) return
      if (audio.paused) audio.play().catch(() => {})
      else audio.pause()
    },

    seek(fraction) {
      if (!audio || !Number.isFinite(audio.duration)) return
      audio.currentTime = audio.duration * Math.max(0, Math.min(1, fraction))
    },

    setFastPreview: (fastPreview) => set({ fastPreview }),
  }
})
