import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Track } from '@serendipia/types'

/**
 * Persistencia local con IndexedDB.
 * - `tracks`: objetos Track (sin blobs) para listados rápidos
 * - `files`: blobs binarios (audio + cover) + peaks de waveform, por track_id
 *
 * Cuando conectemos el backend real (Supabase Storage + PostgreSQL),
 * este layer se reemplaza por el http client — la API pública es la misma.
 */

interface FileBlob {
  track_id: string
  audio_blob: Blob | null
  cover_blob: Blob | null
  peaks: number[] | null    // waveform peaks decimados (~1500 puntos)
}

interface SerendipiaDB extends DBSchema {
  tracks: {
    key: string
    value: Track & { _file_id?: string }
    indexes: { 'by-created': string }
  }
  files: {
    key: string
    value: FileBlob
  }
}

const DB_NAME = 'serendipia'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<SerendipiaDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<SerendipiaDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const tracks = db.createObjectStore('tracks', { keyPath: 'id' })
        tracks.createIndex('by-created', 'created_at')
        db.createObjectStore('files', { keyPath: 'track_id' })
      },
    })
  }
  return dbPromise
}

export async function dbListTracks(): Promise<Track[]> {
  const db = await getDB()
  return db.getAll('tracks')
}

export async function dbPutTrack(track: Track): Promise<void> {
  const db = await getDB()
  await db.put('tracks', track)
}

export async function dbDeleteTrack(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('tracks', id)
  await db.delete('files', id)
}

export async function dbPutFile(
  track_id: string,
  audio_blob: Blob | null,
  cover_blob: Blob | null,
  peaks: number[] | null,
): Promise<void> {
  const db = await getDB()
  await db.put('files', { track_id, audio_blob, cover_blob, peaks })
}

export async function dbGetFile(track_id: string): Promise<FileBlob | undefined> {
  const db = await getDB()
  return db.get('files', track_id)
}

export async function dbGetAllFiles(): Promise<FileBlob[]> {
  const db = await getDB()
  return db.getAll('files')
}

export async function dbHasUploads(): Promise<boolean> {
  const db = await getDB()
  const count = await db.count('files')
  return count > 0
}

export async function dbClearAll(): Promise<void> {
  const db = await getDB()
  await db.clear('tracks')
  await db.clear('files')
}
