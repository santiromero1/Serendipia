import { create } from 'zustand'

let audio: HTMLAudioElement | null = null

function getAudio(): HTMLAudioElement {
  if (audio) return audio
  audio = new Audio()
  audio.preload = 'metadata'
  audio.addEventListener('timeupdate', () => {
    usePlayerStore.setState({ position: audio!.currentTime })
  })
  audio.addEventListener('loadedmetadata', () => {
    usePlayerStore.setState({ duration: audio!.duration })
  })
  audio.addEventListener('ended', () => {
    usePlayerStore.setState({ isPlaying: false, position: 0 })
  })
  return audio
}

interface PlayerState {
  currentTrackId: string | null
  isPlaying: boolean
  position: number
  duration: number
  volume: number

  play: (trackId: string, audioUrl: string) => void
  pause: () => void
  toggle: () => void
  seek: (seconds: number) => void
  /** seek a posición relativa 0–1 (útil para click en waveform) */
  seekRatio: (ratio: number) => void
  setVolume: (v: number) => void
  stop: () => void
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrackId: null,
  isPlaying: false,
  position: 0,
  duration: 0,
  volume: 0.85,

  play(trackId, audioUrl) {
    const a = getAudio()
    if (get().currentTrackId !== trackId) {
      a.src = audioUrl
      a.currentTime = 0
      set({ currentTrackId: trackId, position: 0, duration: 0 })
    }
    a.volume = get().volume
    void a.play().catch(() => set({ isPlaying: false }))
    set({ isPlaying: true })
  },

  pause() {
    const a = getAudio()
    a.pause()
    set({ isPlaying: false })
  },

  toggle() {
    const s = get()
    if (!s.currentTrackId) return
    if (s.isPlaying) get().pause()
    else {
      const a = getAudio()
      void a.play().catch(() => set({ isPlaying: false }))
      set({ isPlaying: true })
    }
  },

  seek(seconds) {
    const a = getAudio()
    a.currentTime = seconds
    set({ position: seconds })
  },

  seekRatio(ratio) {
    const s = get()
    if (!s.duration) return
    get().seek(Math.max(0, Math.min(s.duration, ratio * s.duration)))
  },

  setVolume(v) {
    const a = getAudio()
    const vol = Math.max(0, Math.min(1, v))
    a.volume = vol
    set({ volume: vol })
  },

  stop() {
    const a = getAudio()
    a.pause()
    a.currentTime = 0
    set({ isPlaying: false, currentTrackId: null, position: 0, duration: 0 })
  },
}))
