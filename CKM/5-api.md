# Serendipia — API Spec
> Versión 1.0 · Mayo 2026
> Estado: Draft
> Prioridad: MVP rápido — endpoints mínimos que desbloquean el frontend

---

## 1. Convenciones Generales

```
Base URL:        https://api.serendipia.app/v1
Autenticación:   Bearer token (JWT de Supabase) en header Authorization
Content-Type:    application/json
Charset:         UTF-8
```

### Estructura de respuesta exitosa
```json
{
  "data": { ... },
  "meta": { "total": 100, "limit": 50, "offset": 0, "has_more": true }  // solo en listados
}
```

### Estructura de error
```json
{
  "error": {
    "code": "TRACK_NOT_FOUND",
    "message": "El track solicitado no existe",
    "details": {}
  }
}
```

### Códigos HTTP usados
| Código | Cuándo |
|--------|--------|
| 200 | OK — GET, PUT exitosos |
| 201 | Created — POST exitoso |
| 204 | No Content — DELETE exitoso |
| 400 | Validation error |
| 401 | Sin token o token inválido |
| 403 | Token válido pero sin permiso |
| 404 | Recurso no encontrado |
| 409 | Conflicto (ej: track duplicado) |
| 429 | Rate limit |
| 500 | Error interno |

---

## 2. Tipos Base (TypeScript)

```typescript
// packages/types/src/track.ts

export type MetadataStatus = 'pending' | 'enriched' | 'ai_inferred' | 'manual'
export type MetadataSource = 'spotify' | 'getsongbpm' | 'audio_analysis' | 'ai' | 'manual' | 'rekordbox'
export type TagType = 'moment' | 'genre' | 'custom'
export type TagSource = 'ai' | 'user'

export type DJTag =
  | 'explotarla' | 'peak' | 'calentar' | 'cierre'
  | 'bajarla' | 'emotional' | 'underground' | 'comercial'
  | 'apertura' | 'madrugada' | 'after'

export interface TrackTag {
  id: string
  tag: string
  tag_type: TagType
  source: TagSource
}

export interface Track {
  id: string
  user_id: string
  title: string
  artist: string
  bpm: number | null
  key_camelot: string | null       // "8A", "11B", etc.
  key_standard: string | null      // "Am", "F#", etc.
  energy: number | null            // 0.0 - 1.0
  danceability: number | null      // 0.0 - 1.0
  valence: number | null           // 0.0 - 1.0 — se muestra en UI como "Emotion" (flecha ↑/↓)
  year: number | null
  genre: string[]
  duration_ms: number | null
  spotify_id: string | null
  rating: number | null            // 1 - 5 estrellas (DJ), null = sin valorar
  format: string | null            // 'mp3' | 'wav' | 'aiff' | 'flac' — solo si hay archivo
  bitrate: number | null           // kbps — solo si hay archivo
  audio_file_url: string | null    // ref en Supabase Storage, null si no se subió archivo
  metadata_status: MetadataStatus
  metadata_source: MetadataSource
  notes: string | null
  tags: TrackTag[]
  created_at: string               // ISO 8601
  updated_at: string
}

export interface TrackSummary {    // versión compacta para listas y chat
  id: string
  title: string
  artist: string
  bpm: number | null
  key_camelot: string | null
  energy: number | null
  metadata_status: MetadataStatus
  tags: Pick<TrackTag, 'tag' | 'tag_type'>[]
}

// packages/types/src/playlist.ts

export interface Playlist {
  id: string
  user_id: string
  name: string
  description: string | null
  track_count: number
  created_at: string
  updated_at: string
}

export interface PlaylistWithTracks extends Playlist {
  tracks: (TrackSummary & { position: number })[]
}

// packages/types/src/api.ts

export interface PaginationMeta {
  total: number
  limit: number
  offset: number
  has_more: boolean
}

export interface ImportJobStatus {
  job_id: string
  status: 'processing' | 'completed' | 'failed'
  total: number
  processed: number
  enriched: number
  ai_inferred: number
  failed: number
  created_at: string
  completed_at: string | null
}
```

---

## 3. Endpoints — Tracks

---

### `GET /tracks`

Retorna la biblioteca del usuario autenticado con filtros y paginación.

**Query params:**
```
search        string    Búsqueda por título o artista (ILIKE)
bpm_min       number    BPM mínimo (inclusive)
bpm_max       number    BPM máximo (inclusive)
key_camelot   string[]  Claves Camelot. Ej: ?key_camelot=8A&key_camelot=9A
energy_min    number    0.0 - 1.0
energy_max    number    0.0 - 1.0
dance_min     number    Danceability mínima 0.0 - 1.0
dance_max     number    Danceability máxima 0.0 - 1.0
valence_min   number    Emotion/valence mínima 0.0 - 1.0
valence_max   number    Emotion/valence máxima 0.0 - 1.0
rating_min    number    Rating mínimo 1 - 5 (estrellas)
genre         string[]  Géneros. Ej: ?genre=techno&genre=house
tags          string[]  Tags DJ. Ej: ?tags=peak&tags=explotarla
format        string[]  Formatos. Ej: ?format=mp3&format=wav
bitrate_min   number    Bitrate mínimo en kbps
year_min      number    Año mínimo
year_max      number    Año máximo
status        string    MetadataStatus: pending | enriched | ai_inferred | manual
sort_by       string    bpm | energy | danceability | rating | year | title | created_at (default: created_at)
sort_order    string    asc | desc (default: desc)
limit         number    Default: 50. Max: 200
offset        number    Default: 0
```

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Kernkraft 400",
      "artist": "Zombie Nation",
      "bpm": 138,
      "key_camelot": "8A",
      "key_standard": "Am",
      "energy": 0.91,
      "danceability": 0.87,
      "valence": 0.62,
      "year": 1999,
      "genre": ["techno", "dance"],
      "duration_ms": 245000,
      "spotify_id": "spotify_id_here",
      "rating": 4,
      "format": "mp3",
      "bitrate": 320,
      "audio_file_url": "https://...supabase.co/storage/v1/.../kernkraft.mp3",
      "metadata_status": "enriched",
      "metadata_source": "audio_analysis",
      "notes": null,
      "tags": [
        { "id": "uuid", "tag": "peak", "tag_type": "moment", "source": "ai" },
        { "id": "uuid", "tag": "explotarla", "tag_type": "moment", "source": "ai" }
      ],
      "created_at": "2026-05-01T10:00:00Z",
      "updated_at": "2026-05-01T10:00:00Z"
    }
  ],
  "meta": {
    "total": 1247,
    "limit": 50,
    "offset": 0,
    "has_more": true
  }
}
```

---

### `POST /tracks`

Crea un track y dispara enriquecimiento automático de metadatos.

**Request body:**
```json
{
  "title": "Kernkraft 400",         // requerido
  "artist": "Zombie Nation",        // requerido
  "notes": "Funciona en el peak"    // opcional
}
```

**Validaciones:**
- `title`: string, 1-300 chars
- `artist`: string, 1-300 chars
- Si ya existe un track con mismo `title + artist` para ese usuario → 409

**Flujo interno (pipeline híbrido):**
1. Insertar track con `metadata_status: 'pending'`
2. Buscar en **Spotify** → identidad (año, duración, género, portada, `spotify_id`)
3. Consultar **GetSongBPM** → BPM + clave → `metadata_status: 'enriched'`, `metadata_source: 'getsongbpm'`
4. Campos DJ faltantes (energy/danceability, o BPM/clave sin match) → **Claude** infiere → si Claude cubrió BPM/clave: `metadata_status: 'ai_inferred'`, `metadata_source: 'ai'`
5. Retornar track con metadatos enriquecidos (**objetivo ≤ 4s**, con `tags: []`)
6. **DJ tags via Claude se generan en background** y se insertan en `track_tags`; el cliente los obtiene con un refetch de `GET /tracks/:id`

**Response 201:**
```json
{
  "data": { /* Track completo */ }
}
```

**Errores:**
```
400 VALIDATION_ERROR   → campos inválidos
409 TRACK_DUPLICATE    → ya existe title+artist para este usuario
```

---

### `POST /tracks/upload`

Crea un track a partir de un **archivo de audio**. Activa el análisis de audio (DSP) para medir BPM/energy/danceability de la waveform.

**Request:** `multipart/form-data`
```
file      File      requerido — .mp3 | .wav | .aiff | .flac (máx. 50 MB)
title     string    opcional — si no viene, se infiere del tag ID3 / nombre de archivo
artist    string    opcional — idem
```

**Flujo interno (camino B — DSP):**
1. Subir el archivo a Supabase Storage → `audio_file_url`
2. Leer header → `format`, `bitrate`, y tags ID3 (title/artist si no se pasaron)
3. Insertar track con `metadata_status: 'pending'`
4. **Análisis DSP de la waveform** → BPM, energy, danceability (y clave si se estima) → `metadata_source: 'audio_analysis'`
5. **Spotify** → identidad/catálogo (año, género, portada, `spotify_id`)
6. Lo que el DSP no cubra (valence, género faltante) → **Claude**
7. Retornar el track; si el DSP excede el presupuesto de latencia corre async y el cliente refetchea
8. DJ tags en background (igual que `POST /tracks`)

**Response 201:** `{ "data": { /* Track completo, con format/bitrate/audio_file_url */ } }`

**Errores:**
```
400 VALIDATION_ERROR     → archivo ausente o campos inválidos
413 FILE_TOO_LARGE       → supera 50 MB
415 UNSUPPORTED_FORMAT   → formato de audio no soportado
409 TRACK_DUPLICATE      → ya existe title+artist para este usuario
```

---

### `GET /tracks/:id`

Retorna un track completo por ID.

**Response 200:** Track completo (mismo schema que arriba)

**Errores:**
```
404 TRACK_NOT_FOUND
403 FORBIDDEN          → el track no pertenece al usuario
```

---

### `PUT /tracks/:id`

Actualiza campos de un track. Permite edición manual de metadatos.

**Request body** (todos opcionales):
```json
{
  "title": "string",
  "artist": "string",
  "bpm": 138,
  "key_camelot": "8A",
  "key_standard": "Am",
  "energy": 0.91,
  "danceability": 0.87,
  "valence": 0.62,
  "rating": 4,
  "year": 1999,
  "genre": ["techno"],
  "notes": "string"
}
```

Si se actualiza `title` o `artist` → el campo `metadata_source` pasa a `manual`. El `rating` es siempre editable por el DJ y no altera `metadata_source` (es dato propio, no de enriquecimiento).

**Response 200:** Track completo actualizado

---

### `DELETE /tracks/:id`

Elimina un track y sus tags asociados.

**Response 204:** Sin body

---

### `POST /tracks/:id/tags`

Agrega un tag custom creado por el usuario.

**Request body:**
```json
{
  "tag": "mi-tag-custom",
  "tag_type": "custom"
}
```

**Validaciones:**
- `tag`: string, 1-50 chars, lowercase, sin espacios (reemplazar con guión)
- `tag_type`: solo `"custom"` permitido en este endpoint (los `moment` los genera la IA)

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "tag": "mi-tag-custom",
    "tag_type": "custom",
    "source": "user"
  }
}
```

---

### `DELETE /tracks/:id/tags/:tagId`

Elimina un tag de un track (tanto AI como user).

**Response 204:** Sin body

---

### `POST /tracks/import/xml`

Importa una biblioteca desde un archivo XML de Rekordbox.

**Request:** `multipart/form-data`
```
file: <archivo XML>    requerido, max 50MB
```

**Flujo interno:**
1. Validar que es XML de Rekordbox válido
2. Parsear todos los tracks del XML
3. Filtrar duplicados (title + artist ya existentes)
4. Insertar tracks nuevos con metadatos base de Rekordbox
5. Crear job de enriquecimiento en background
6. Retornar job_id inmediatamente

**Response 202:** (Accepted — procesamiento en background)
```json
{
  "data": {
    "job_id": "uuid",
    "status": "processing",
    "total": 1247,
    "processed": 0,
    "enriched": 0,
    "ai_inferred": 0,
    "failed": 0,
    "created_at": "2026-05-01T10:00:00Z",
    "completed_at": null
  }
}
```

**Errores:**
```
400 XML_INVALID_FORMAT  → no es un XML de Rekordbox válido
400 XML_PARSE_ERROR     → el archivo está corrupto
```

---

### `GET /tracks/import/jobs/:jobId`

Polling del estado de un job de importación.

**Response 200:**
```json
{
  "data": {
    "job_id": "uuid",
    "status": "processing",
    "total": 1247,
    "processed": 423,
    "enriched": 401,
    "ai_inferred": 22,
    "failed": 0,
    "created_at": "2026-05-01T10:00:00Z",
    "completed_at": null
  }
}
```

---

### `POST /tracks/import/csv`

Importación rápida desde CSV con columnas `title, artist`.

**Request:** `multipart/form-data`
```
file: <archivo CSV>    requerido, max 5MB
```

**Formato CSV esperado:**
```csv
title,artist
Kernkraft 400,Zombie Nation
Sandstorm,Darude
```

**Response 202:** Mismo schema que import/xml

---

## 4. Endpoints — Playlists

---

### `GET /playlists`

Lista todas las playlists del usuario.

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Set Viernes Club",
      "description": "Set de apertura para la sala grande",
      "track_count": 24,
      "created_at": "2026-05-01T10:00:00Z",
      "updated_at": "2026-05-01T10:00:00Z"
    }
  ]
}
```

---

### `POST /playlists`

**Request body:**
```json
{
  "name": "Set Viernes Club",      // requerido, 1-200 chars
  "description": "opcional"
}
```

**Response 201:** Playlist creada (sin tracks aún)

---

### `GET /playlists/:id`

Retorna la playlist con todos sus tracks en orden.

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Set Viernes Club",
    "description": null,
    "track_count": 2,
    "tracks": [
      {
        "id": "uuid",
        "title": "Kernkraft 400",
        "artist": "Zombie Nation",
        "bpm": 138,
        "key_camelot": "8A",
        "energy": 0.91,
        "metadata_status": "enriched",
        "tags": [{ "tag": "peak", "tag_type": "moment" }],
        "position": 1
      }
    ],
    "created_at": "...",
    "updated_at": "..."
  }
}
```

---

### `PUT /playlists/:id`

Actualiza nombre o descripción.

**Request body:**
```json
{
  "name": "nuevo nombre",
  "description": "nueva descripción"
}
```

**Response 200:** Playlist actualizada

---

### `DELETE /playlists/:id`

Elimina la playlist (no elimina los tracks de la biblioteca).

**Response 204:** Sin body

---

### `POST /playlists/:id/tracks`

Agrega un track a la playlist.

**Request body:**
```json
{
  "track_id": "uuid",
  "position": 3          // opcional — si no se pasa, se agrega al final
}
```

**Response 201:**
```json
{
  "data": {
    "track_id": "uuid",
    "position": 3
  }
}
```

**Errores:**
```
404 TRACK_NOT_FOUND     → el track no existe o no pertenece al usuario
409 TRACK_IN_PLAYLIST   → el track ya está en esta playlist
```

---

### `DELETE /playlists/:id/tracks/:trackId`

Quita un track de la playlist.

**Response 204:** Sin body

---

### `PUT /playlists/:id/tracks/reorder`

Reordena los tracks de una playlist.

**Request body:**
```json
{
  "track_ids": ["uuid-3", "uuid-1", "uuid-2"]   // array completo en el nuevo orden
}
```

**Response 200:** Playlist completa actualizada

---

### `GET /playlists/:id/export`

Exporta la playlist para importar en Rekordbox o Serato.

**Query params:**
```
format    string    "xml" | "m3u"    requerido
```

**Response 200:**
```
Content-Type: application/xml  (o audio/x-mpegurl para m3u)
Content-Disposition: attachment; filename="Set_Viernes_Club_2026-05-01.xml"

[contenido del archivo]
```

---

## 5. Endpoints — Conexiones (Fase 2)

> Estos endpoints no son parte del MVP. Se documentan para no cambiar contratos después.

---

### `GET /tracks/:id/connections`

Retorna los tracks más compatibles con el track dado, ordenados por score.

**Query params:**
```
limit     number    Default: 10. Max: 50
min_score number    Default: 0.65
```

**Response 200:**
```json
{
  "data": [
    {
      "track": { /* TrackSummary */ },
      "score": 0.92,
      "bpm_diff": 2,
      "key_compatible": true,
      "energy_diff": 0.04
    }
  ]
}
```

---

### `POST /connections/compute`

Recalcula todas las conexiones de la biblioteca del usuario. Job en background.

**Response 202:**
```json
{
  "data": {
    "job_id": "uuid",
    "status": "processing"
  }
}
```

---

## 6. Endpoints — Chat IA (Fase 3)

> No son parte del MVP. Se documentan para no cambiar contratos después.

---

### `POST /chat`

Envía un mensaje al asistente IA con contexto de la biblioteca.

**Request body:**
```json
{
  "message": "Quiero explotar la pista, estoy en 130 BPM",
  "session_id": "uuid",            // opcional, para mantener historial
  "context": {
    "current_bpm": 130,            // opcional, contexto del set actual
    "current_key": "8A"
  }
}
```

**Response 200:**
```json
{
  "data": {
    "session_id": "uuid",
    "message": "Encontré 4 tracks perfectos para ese momento...",
    "tracks": [ /* TrackSummary[] — los recomendados */ ],
    "filters_applied": {
      "bpm_min": 126,
      "bpm_max": 134,
      "energy_min": 0.8,
      "tags": ["peak", "explotarla"]
    }
  }
}
```

---

## 7. Endpoints — Auth

> Supabase maneja el grueso del auth. Solo se documenta lo que el backend necesita exponer.

---

### `GET /auth/me`

Retorna el perfil del usuario autenticado.

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "email": "dj@example.com",
    "created_at": "2026-01-01T00:00:00Z",
    "library_stats": {
      "total_tracks": 1247,
      "enriched": 1190,
      "pending": 57,
      "total_playlists": 8
    }
  }
}
```

---

### `GET /auth/me/export`  *(GDPR — Fase 1 tardía / Fase 2)*

Exporta **todos** los datos del usuario (tracks, tags, playlists) en JSON descargable.

**Response 200:**
```
Content-Type: application/json
Content-Disposition: attachment; filename="serendipia_export_2026-05-01.json"

{ "user": {...}, "tracks": [...], "playlists": [...] }
```

> La **eliminación** de datos no necesita endpoint propio: borrar la cuenta en Supabase Auth dispara `ON DELETE CASCADE` sobre tracks, tags, playlists y jobs.

---

## 8. Rate Limiting

| Endpoint | Límite |
|---------|--------|
| `POST /tracks` | 60 req/min por usuario |
| `POST /tracks/import/xml` | 5 req/hora por usuario |
| `POST /tracks/import/csv` | 10 req/hora por usuario |
| `POST /chat` | 30 req/min por usuario |
| Resto | 300 req/min por usuario |

---

## 9. Ejemplos de Uso — cURL

```bash
# Autenticación (obtener token desde Supabase)
TOKEN="eyJ..."

# Agregar un track
curl -X POST https://api.serendipia.app/v1/tracks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "title": "Sandstorm", "artist": "Darude" }'

# Buscar tracks techno entre 128 y 138 BPM
curl "https://api.serendipia.app/v1/tracks?genre=techno&bpm_min=128&bpm_max=138&sort_by=energy&sort_order=desc" \
  -H "Authorization: Bearer $TOKEN"

# Importar XML de Rekordbox
curl -X POST https://api.serendipia.app/v1/tracks/import/xml \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/rekordbox_collection.xml"

# Polling del job de importación
curl "https://api.serendipia.app/v1/tracks/import/jobs/JOB_ID" \
  -H "Authorization: Bearer $TOKEN"

# Exportar playlist como XML para Rekordbox
curl "https://api.serendipia.app/v1/playlists/PLAYLIST_ID/export?format=xml" \
  -H "Authorization: Bearer $TOKEN" \
  -o "mi_set.xml"
```

---

*API Spec — documento vivo. Versionar breaking changes con prefijo /v2.*