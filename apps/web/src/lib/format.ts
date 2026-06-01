import type { MetadataStatus, MetadataSource } from '@serendipia/types'

/** Color de la escala de energía (CKM/3-design.md §2.1). */
export function energyColor(energy: number | null): string {
  if (energy == null) return '#475569' // fg-faint
  if (energy < 0.35) return '#3b82f6' // low
  if (energy < 0.65) return '#a78bfa' // mid
  if (energy < 0.85) return '#f59e0b' // high
  return '#ef4444' // peak
}

export function energyLabel(energy: number | null): string {
  if (energy == null) return 'Sin dato'
  if (energy < 0.35) return 'Baja'
  if (energy < 0.65) return 'Media'
  if (energy < 0.85) return 'Alta'
  return 'Peak'
}

/** Emoción derivada de valence (0..1): ↓ oscura · → neutra · ↑ luminosa. */
export function emotion(valence: number | null): { arrow: '↑' | '→' | '↓'; label: string; color: string } {
  if (valence == null) return { arrow: '→', label: 'Sin dato', color: '#475569' }
  if (valence < 0.4) return { arrow: '↓', label: 'Oscura', color: '#3b82f6' }
  if (valence > 0.6) return { arrow: '↑', label: 'Luminosa', color: '#f59e0b' }
  return { arrow: '→', label: 'Neutra', color: '#a78bfa' }
}

/** Fecha de subida legible en es-AR (ej. "20 may 2026"). */
export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDuration(ms: number | null): string {
  if (ms == null) return '—'
  const totalSec = Math.round(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

export interface SourceBadge {
  label: string
  /** clave de color semántico para el Badge */
  tone: 'success' | 'warning' | 'info' | 'muted'
}

/** Badge de fuente de metadatos (CKM/3-design.md §7). */
export function sourceBadge(status: MetadataStatus, source: MetadataSource): SourceBadge {
  if (status === 'pending') return { label: '○ Pendiente', tone: 'muted' }
  if (status === 'manual' || source === 'manual') return { label: '✎ Manual', tone: 'info' }
  if (status === 'ai_inferred' || source === 'ai') return { label: '~ IA', tone: 'warning' }
  if (source === 'getsongbpm') return { label: '✓ BPM', tone: 'success' }
  if (source === 'rekordbox') return { label: '✓ Rekordbox', tone: 'success' }
  return { label: '✓ Spotify', tone: 'success' }
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
