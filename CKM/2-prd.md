# Serendipia — Product Requirements Document (PRD)
> Versión 1.0 · Mayo 2026  
> Estado: Draft

---

## 1. Resumen Ejecutivo

Serendipia es una plataforma web de curación musical inteligente para DJs. Permite enriquecer una biblioteca musical con metadatos automáticos generados por IA, visualizarla como una red de conexiones y consultarla en lenguaje natural para preparar sets.

**Stack:** React + Tailwind · Node.js · Supabase · Spotify (identidad) · GetSongBPM (BPM/clave) · Análisis de audio DSP (si hay archivo) · Claude API · D3.js

---

## 2. Objetivos del Producto

| Objetivo | Métrica | Target MVP |
|---------|---------|-----------|
| Reducir tiempo de prep de set | Minutos promedio | -40% vs línea base |
| Enriquecimiento automático de tracks | % tracks con metadatos completos | >85% |
| Adopción de IA conversacional | Queries por sesión | >3 por sesión activa |
| Retención | Usuarios activos semana 4 | >40% |

---

## 3. Alcance del MVP (Fase 1)

### Incluido
- Carga de tracks por nombre + artista
- Enriquecimiento automático via Spotify API
- Etiquetas contextuales de DJ generadas por IA
- Biblioteca visual con filtros y búsqueda
- Importación desde Rekordbox XML
- Exportación de playlists a XML / M3U

### Excluido del MVP
- Grafo visual de conexiones (Fase 2)
- IA conversacional (Fase 3)
- App mobile (Fase 4)
- Colaboración entre DJs (Fase 4)

---

## 4. Arquitectura del Sistema

```
┌─────────────────────────────────────────┐
│              FRONTEND                   │
│         React + Tailwind CSS            │
│   Biblioteca · Filtros · Import/Export  │
└────────────────┬────────────────────────┘
                 │ REST API
┌────────────────▼────────────────────────┐
│              BACKEND                    │
│             Node.js                     │
│   Auth · Track CRUD · Metadata Engine  │
└──────┬──────────────┬───────────────────┘
       │              │
┌──────▼──────┐ ┌─────▼──────────┐
│  Supabase   │ │  External APIs  │
│  PostgreSQL │ │  Spotify (id)   │
│  Auth       │ │  GetSongBPM     │
│             │ │  Claude API     │
└─────────────┘ └────────────────┘
```

---

## 5. Modelo de Datos

### Tabla `tracks`
```sql
id              UUID PRIMARY KEY
user_id         UUID REFERENCES auth.users(id)
title           TEXT NOT NULL
artist          TEXT NOT NULL
bpm             INTEGER
key_camelot     TEXT           -- e.g. "8A", "11B"
key_standard    TEXT           -- e.g. "Am", "F#"
energy          DECIMAL(4,3)   -- 0.000 a 1.000
danceability    DECIMAL(4,3)
valence         DECIMAL(4,3)   -- mood: sad → happy. Se muestra en UI como "Emotion" (flecha ↑/↓)
year            INTEGER
genre           TEXT[]
duration_ms     INTEGER
spotify_id      TEXT
rating          SMALLINT       -- valoración del DJ, 1 a 5 estrellas (NULL = sin valorar)
format          TEXT           -- 'mp3' | 'wav' | 'aiff' | 'flac' ... (solo si hay archivo)
bitrate         INTEGER        -- kbps, leído del header del archivo (solo si hay archivo)
audio_file_url  TEXT           -- ref al archivo en Supabase Storage (NULL si no se subió)
notes           TEXT           -- notas personales del DJ
metadata_status TEXT           -- 'pending' | 'enriched' | 'ai_inferred' | 'manual'
metadata_source TEXT           -- 'spotify' | 'getsongbpm' | 'audio_analysis' | 'ai' | 'manual' | 'rekordbox'
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

> `metadata_status` describe el grado de completitud; `metadata_source` indica de dónde salió el dato DJ-crítico (BPM/clave). Cuando el DJ sube el archivo, el análisis de audio (DSP) tiene prioridad sobre GetSongBPM/Claude para BPM/energy/danceability → `metadata_source: 'audio_analysis'`. `format`/`bitrate` solo existen si hay archivo. `valence` es el dato; la columna **Emotion** de la UI es su render como flecha (alto = ↑, bajo = ↓). Esquema alineado con `5-api.md` §2 y la migración de `7-impl.md` §2.2.

### Tabla `track_tags`
```sql
id          UUID PRIMARY KEY
track_id    UUID REFERENCES tracks(id)
tag         TEXT    -- e.g. 'explotarla', 'calentar', 'cierre'
tag_type    TEXT    -- 'moment' | 'genre' | 'custom'
source      TEXT    -- 'ai' | 'user'
created_at  TIMESTAMPTZ
```

### Tabla `playlists`
```sql
id          UUID PRIMARY KEY
user_id     UUID REFERENCES users(id)
name        TEXT
description TEXT
created_at  TIMESTAMPTZ
```

### Tabla `playlist_tracks`
```sql
playlist_id UUID REFERENCES playlists(id)
track_id    UUID REFERENCES tracks(id)
position    INTEGER
PRIMARY KEY (playlist_id, track_id)
```

### Tabla `connections` *(Fase 2)*
```sql
id              UUID PRIMARY KEY
track_a_id      UUID REFERENCES tracks(id)   -- orden canónico: track_a_id < track_b_id
track_b_id      UUID REFERENCES tracks(id)
score             DECIMAL(4,3) -- compatibilidad 0 a 1
bpm_diff          INTEGER
key_compatible    BOOLEAN
energy_diff       DECIMAL(4,3)
danceability_diff DECIMAL(4,3)
valence_diff      DECIMAL(4,3)
created_at        TIMESTAMPTZ
```

> Para evitar conexiones duplicadas (a→b y b→a), se guarda una sola fila con `track_a_id < track_b_id` (orden canónico por UUID) + índice único `(track_a_id, track_b_id)`.

---

## 6. Funcionalidades Detalladas

---

### F-01: Carga de Tracks

**Descripción:** El usuario puede agregar tracks a su biblioteca de dos maneras: ingresando artista + título (sin archivo), o subiendo el archivo de audio.

**Flujo A — sin archivo (pipeline híbrido por APIs):**
1. Usuario ingresa `artista` + `título` en el formulario
2. Sistema busca en **Spotify** → identidad del track (título canónico, año, duración, género, portada, `spotify_id`)
3. Sistema consulta **GetSongBPM** → BPM + clave musical
4. Campos DJ que falten (energy/danceability, o BPM/clave si GetSongBPM no tuvo match) → **Claude** los infiere
5. Track queda en estado `enriched` (datos de APIs) o `ai_inferred` (Claude cubrió BPM/clave)
6. Los **DJ tags se generan en background** (no bloquean la respuesta)
7. Usuario puede editar manualmente cualquier campo

**Flujo B — con archivo (análisis de audio DSP):**
1. Usuario sube el archivo (`.mp3`/`.wav`/`.aiff`/`.flac`); se guarda en Supabase Storage
2. Sistema lee del header → `format` y `bitrate`
3. **Análisis DSP de la waveform** → BPM, energy, danceability medidos de la señal real (datos más precisos que las APIs); también clave si el algoritmo la estima
4. **Spotify** se sigue consultando para identidad/catálogo (año, género, portada, `spotify_id`)
5. Lo que el DSP no cubra (p. ej. `valence`/emotion, o género faltante) lo completa **Claude**
6. Track queda en estado `enriched` con `metadata_source: 'audio_analysis'` para los campos medidos
7. DJ tags en background; el usuario puede editar cualquier campo

> El DSP **no reemplaza** al pipeline de APIs: lo complementa. Sin archivo (underground, bootlegs, edits), el camino A sigue siendo el único — esa es la ventaja diferencial frente a DJoid, que exige archivo siempre. Con archivo, ganamos la precisión de medir el audio.

**Criterios de aceptación:**
- [ ] Los metadatos (BPM, clave, energía) se resuelven en **≤ 4 segundos** (camino A) y la respuesta los incluye
- [ ] Con archivo subido, `format` y `bitrate` se leen correctamente del header
- [ ] El análisis DSP completa BPM/energy/danceability y marca `metadata_source: 'audio_analysis'`; corre async si excede el presupuesto de latencia
- [ ] Los DJ tags aparecen poco después (generación async), sin bloquear el guardado
- [ ] Carga masiva vía CSV (columnas: título, artista) funciona para hasta 500 tracks
- [ ] `metadata_status` y `metadata_source` reflejan correctamente el grado y la fuente
- [ ] El usuario puede editar cualquier campo manualmente, incluido el `rating` (1–5 estrellas)
- [ ] Tracks duplicados muestran advertencia antes de guardar

**Endpoints:**
```
POST /api/tracks            Body: { title, artist }            → camino A (APIs)
POST /api/tracks/upload     multipart/form-data: file[, title, artist]  → camino B (DSP)
Response: Track con metadatos enriquecidos (tags y DSP pesado se completan async)
```

---

### F-02: Enriquecimiento de Metadatos (pipeline híbrido)

> **Contexto importante:** Spotify **deprecó el endpoint `audio-features`** (BPM, key, energy, danceability, valence) para apps nuevas en nov-2024. Por eso el enriquecimiento es híbrido y reparte responsabilidades entre tres fuentes.

| Fuente | Aporta | Notas |
|--------|--------|-------|
| **Análisis de audio (DSP)** *(solo si hay archivo)* | BPM, energy, danceability medidos de la waveform; `format` + `bitrate` del header | **Máxima precisión** y prioridad sobre el resto para esos campos. Requiere que el DJ haya subido el archivo. |
| **Spotify** (search + track/artist) | Título canónico, año, duración, género, portada, `spotify_id` | Solo identidad/catálogo. **No** da audio-features. Género viene del *artist object* y suele venir incompleto. |
| **GetSongBPM** | BPM + clave musical | Fuente dedicada de datos DJ. Buena cobertura para tracks comerciales/conocidos. Se usa cuando no hay archivo (o como respaldo de clave). |
| **Claude** (fallback) | Lo que falte: energy, danceability, valence; y BPM/clave de tracks underground/edits sin match | Único camino para bootlegs sin presencia en APIs **ni archivo**. Prompt estructurado, salida JSON validada. |

> **Orden de prioridad para campos DJ-críticos (BPM/energy/danceability):** análisis DSP (si hay archivo) → GetSongBPM (BPM/clave) → Claude (inferencia). El primero que aporte un dato confiable gana; `metadata_source` registra cuál fue.

**Conversión de key a Camelot:**
```javascript
// La clave llega como par (key 0-11, mode 0/1) estilo Spotify, o como
// string musical desde GetSongBPM/Claude. utils/camelot la normaliza a Camelot.
const CAMELOT = {
  // { key: mode } -> camelot
  '0-1': '8B', '1-1': '3B', '2-1': '10B', // ...major
  '0-0': '5A', '1-0': '12A', '2-0': '7A', // ...minor
  // tabla completa en utils/camelot.js
}
```

**Estado resultante:**
- Si BPM/clave vienen de GetSongBPM → `metadata_status: 'enriched'`, `metadata_source: 'getsongbpm'`
- Si Claude tuvo que inferir BPM/clave → `metadata_status: 'ai_inferred'`, `metadata_source: 'ai'`, badge visual `~ IA`
- El usuario siempre puede corregir manualmente (pasa a `manual`)

---

### F-03: Etiquetas Contextuales de DJ (IA)

**Descripción:** Claude API genera etiquetas de momento del set basadas en los metadatos del track.

**Prompt base:**
```
Sos un DJ profesional con 15 años de experiencia.
Dado este track con los siguientes metadatos:
- Título: {title}
- Artista: {artist}
- BPM: {bpm}
- Clave: {key_camelot}
- Energía: {energy} (0-1)
- Danceability: {danceability} (0-1)
- Género: {genre}

Generá entre 2 y 4 etiquetas de momento para un set de DJ.
Usá solo etiquetas de esta lista: 
explotarla, calentar, peak, cierre, bajarla, emotional, 
underground, comercial, apertura, madrugada, after

Respondé SOLO con un array JSON. Ejemplo: ["peak", "explotarla"]
```

**Criterios de aceptación:**
- [ ] Siempre retorna entre 2 y 4 etiquetas
- [ ] Las etiquetas pertenecen al set definido
- [ ] El usuario puede agregar/quitar etiquetas manualmente
- [ ] Las etiquetas se muestran como chips visuales en la card del track

---

### F-04: Biblioteca Visual

**Descripción:** Vista principal de la biblioteca con filtros y búsqueda.

**Filtros disponibles** (panel ajustable en el sidebar izquierdo):
- Clave Camelot (selector múltiple con **rueda Camelot** visual)
- BPM (rango: slider doble)
- Energía (rango: slider doble, 1–10)
- Danceability (rango: slider doble, 1–10)
- Emotion / valence (rango: slider doble)
- Rating (mínimo de estrellas: 1–5)
- Género (selector múltiple)
- Etiquetas de DJ (selector múltiple)
- Año (rango)
- Formato (mp3 / wav / ...) y bitrate mínimo *(solo aplican a tracks con archivo)*
- Estado de metadatos (enriquecido / inferido por IA / manual)

> Los rangos de energía/danceability/emotion se muestran al DJ en escala 1–10 (como en DJoid) pero se guardan internamente como `DECIMAL(4,3)` 0.0–1.0.

**Vistas:**
- Grid de cards (default)
- Lista compacta (para bibliotecas grandes)

**Card de track muestra:**
- Título + Artista
- BPM · Clave Camelot · Energía (barra visual) · Danceability · Emotion (flecha ↑/↓)
- Rating (estrellas, editable in-place)
- Género (genre prediction) + etiquetas DJ como chips
- Badge de fuente de metadatos (incluye `audio_analysis` cuando vino del DSP)
- Formato + bitrate (si el track tiene archivo)
- Acciones: editar, agregar a playlist, ver conexiones

**Criterios de aceptación:**
- [ ] Búsqueda por texto en tiempo real (título o artista)
- [ ] Filtros combinables entre sí
- [ ] El DJ puede asignar/editar el rating (1–5 estrellas) desde la lista o la card
- [ ] Ordenamiento por BPM, energía, danceability, rating, año, título
- [ ] Performance: renderiza 1000+ tracks sin lag perceptible
- [ ] Estado de filtros persiste en URL (compartible)

---

### F-05: Importación desde Rekordbox XML

**Descripción:** El usuario puede importar su biblioteca existente de Rekordbox vía archivo XML.

**Flujo:**
1. Usuario exporta XML desde Rekordbox (File → Export Collection as XML)
2. Arrastra o sube el archivo a Serendipia
3. Sistema parsea el XML y extrae todos los tracks
4. Para cada track: busca en Spotify y enriquece metadatos
5. Muestra progreso en tiempo real
6. Al finalizar, muestra resumen: X tracks importados, Y sin metadatos encontrados

**Campos extraídos del XML de Rekordbox:**
```xml
<TRACK TrackID="..." Name="..." Artist="..." BPM="..." 
       Tonality="..." Genre="..." Year="..." Location="..."/>
```

**Criterios de aceptación:**
- [ ] Soporta archivos XML de Rekordbox v5 y v6
- [ ] Proceso de enriquecimiento es asincrónico con barra de progreso
- [ ] Tracks duplicados no se reimportan (detectados por título+artista)
- [ ] Metadatos existentes de Rekordbox se respetan y complementan
- [ ] Importación de 1000 tracks completa en < 10 minutos (enriquecimiento async vía GetSongBPM + Claude, en lotes con rate-limit)

---

### F-06: Exportación de Playlists

**Descripción:** El usuario puede exportar playlists armadas en Serendipia de vuelta a Rekordbox o Serato.

**Formatos de exportación:**
- `.xml` — compatible con Rekordbox
- `.m3u` — compatible con Serato y reproductores generales

**Criterios de aceptación:**
- [ ] Exportación genera archivo descargable en < 5 segundos
- [ ] El XML generado es importable en Rekordbox sin errores
- [ ] El orden de tracks en el archivo respeta el orden de la playlist
- [ ] Nombre del archivo incluye nombre de playlist + fecha

---

## 7. Grafo de Conexiones (Fase 2)

### F-07: Visualización en Grafo

**Descripción:** Vista alternativa de la biblioteca como red de nodos interconectados.

**Tecnología:** D3.js force-directed graph

**Lógica de conexiones:**
```javascript
// Score de compatibilidad entre dos tracks (0 a 1)
function compatibilityScore(trackA, trackB) {
  const bpmScore   = 1 - Math.min(Math.abs(trackA.bpm - trackB.bpm), 8) / 8
  const keyScore   = camelotCompatibilityScore(trackA.key_camelot, trackB.key_camelot) // 1.0 / 0.8 / 0
  const energyScore = 1 - Math.abs(trackA.energy - trackB.energy)
  const danceScore  = 1 - Math.abs(trackA.danceability - trackB.danceability)
  const emotionScore = 1 - Math.abs(trackA.valence - trackB.valence) // "Emotion" = valence

  // BPM y clave siguen dominando (compatibilidad de mezcla); energy/dance/emotion afinan el matiz
  return (bpmScore * 0.35)
       + (keyScore * 0.35)
       + (energyScore * 0.15)
       + (danceScore * 0.075)
       + (emotionScore * 0.075)
}

// Se crea conexión si score > 0.65
```

> Pesos: BPM y clave concentran el 70% porque son los que determinan si dos tracks se pueden mezclar de hecho. Energy aporta 15% y danceability/emotion 7.5% cada uno — afinan la *vibra* de la conexión sin desplazar la compatibilidad técnica. Si alguno de `danceability`/`valence` es `null` (track sin esos datos), su término se omite y los pesos se renormalizan.

**Compatibilidad Camelot:**
- Misma clave: score 1.0
- Adyacente en rueda (±1): score 1.0
- Cambio de modo (A↔B misma posición): score 0.8
- Todo lo demás: score 0

**UX del grafo:**
- Zoom y pan con mouse/trackpad
- Click en nodo → abre card del track
- Hover en nodo → resalta conexiones directas
- Filtros de biblioteca aplican también al grafo
- Colores de nodos representan energía (frío=baja, cálido=alta)

---

## 8. IA Conversacional (Fase 3)

### F-08: Chat con la Biblioteca

**Descripción:** Interface de chat donde el DJ consulta su biblioteca en lenguaje natural.

**Arquitectura:**
```
Usuario escribe query
        ↓
Preprocesamiento: extraer intención + parámetros
        ↓
Traducir a filtros: { bpm_range, energy_range, tags, key }
        ↓
Query a base de datos
        ↓
Claude formatea respuesta con tracks encontrados
        ↓
Respuesta con cards de tracks interactivas
```

**System prompt base:**
```
Sos el asistente de DJ de Serendipia. Tenés acceso a la biblioteca 
personal del DJ que contiene {track_count} tracks.

Cuando el DJ te pida recomendaciones, convertí su pedido en 
parámetros de búsqueda y respondé con los tracks más adecuados 
de su biblioteca. Siempre explicá brevemente por qué cada track 
encaja con lo que pidió.

Usá el lenguaje del DJ: energía, momento, vibe, pista, mezcla.
Nunca uses jerga de ingeniero de audio.

Biblioteca disponible: {library_json}
```

**Ejemplos de queries y respuesta esperada:**
```
DJ: "Quiero explotar la pista, estoy en 128 BPM"
→ Filtra: energy > 0.8, bpm 124-132, tags incluye 'explotarla' o 'peak'
→ Responde con 3-5 tracks + explicación de por qué cada uno

DJ: "¿Qué mezcla bien después de Kernkraft 400?"
→ Busca Kernkraft 400 en biblioteca
→ Calcula tracks con score de compatibilidad > 0.7
→ Responde con los 5 más compatibles ordenados por score

DJ: "Dame algo para el cierre, emotional, clave Am"
→ Filtra: key_camelot '8A', tags incluye 'emotional' o 'cierre', energy < 0.6
```

---

## 9. API Endpoints

```
# Tracks
GET    /api/tracks              → Lista con filtros via query params
POST   /api/tracks              → Crear track (enriquece automáticamente)
PUT    /api/tracks/:id          → Actualizar track
DELETE /api/tracks/:id          → Eliminar track
POST   /api/tracks/import/xml   → Importar desde Rekordbox XML
POST   /api/tracks/import/csv   → Importar desde CSV

# Playlists
GET    /api/playlists           → Lista de playlists del usuario
POST   /api/playlists           → Crear playlist
PUT    /api/playlists/:id       → Actualizar
DELETE /api/playlists/:id       → Eliminar
POST   /api/playlists/:id/tracks → Agregar track
DELETE /api/playlists/:id/tracks/:trackId → Quitar track
GET    /api/playlists/:id/export → Exportar (query: format=xml|m3u)

# Conexiones (Fase 2)
GET    /api/tracks/:id/connections → Tracks compatibles ordenados por score
POST   /api/connections/compute    → Recomputar conexiones de la biblioteca

# Chat (Fase 3)
POST   /api/chat               → Query conversacional
```

---

## 10. Plan de Desarrollo

### Fase 1 — MVP (Semanas 1–6)
- [ ] Setup proyecto: repo, Supabase, auth básica
- [ ] Modelo de datos: tracks, tags, playlists
- [ ] Integración Spotify (identidad) + GetSongBPM (BPM/clave) + Claude (fallback) — pipeline de enriquecimiento
- [ ] Generación de etiquetas DJ con Claude API
- [ ] Biblioteca visual con filtros
- [ ] Importación Rekordbox XML
- [ ] Exportación XML / M3U
- [ ] Deploy en Vercel + dominio

### Fase 2 — El Cerebro (Semanas 7–12)
- [ ] Algoritmo de compatibilidad (bpm + camelot + energía)
- [ ] Cálculo y almacenamiento de conexiones en background
- [ ] Grafo D3.js: renderizado, zoom, hover, click
- [ ] Filtros de biblioteca aplicados al grafo
- [ ] Scatter Map (energía vs danceability)
- [ ] "Chapter Builder": sets segmentados por energía

### Fase 3 — IA Conversacional (Semanas 13–16)
- [ ] Interface de chat en sidebar
- [ ] Sistema de traducción query → filtros
- [ ] Integración Claude API con contexto de biblioteca
- [ ] Respuestas con cards interactivas de tracks
- [ ] Historial de conversaciones por sesión

### Fase 4 — Escala (Futuro)
- [ ] App mobile (React Native)
- [ ] Integración directa SQLite Rekordbox
- [ ] Colaboración entre DJs
- [ ] Marketplace de sets
- [ ] API pública

---

## 11. Stack Tecnológico

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| Frontend | React + Tailwind CSS | Ecosistema amplio, rápido de iterar |
| Backend | Node.js + Express | JavaScript full-stack, buena integración con APIs externas |
| Base de datos | Supabase (PostgreSQL) | Auth incluida, real-time, generous free tier |
| Música API (identidad) | Spotify Web API | Mayor cobertura de catálogo para matching (título, año, género, portada). Nota: audio-features deprecado para apps nuevas. |
| Datos DJ (BPM/clave) | GetSongBPM API | Fuente dedicada de BPM y clave musical, reemplaza los audio-features de Spotify |
| IA | Claude API (`claude-sonnet-4-6` inferencia/chat, `claude-haiku-4-5` tags) | Comprensión de lenguaje natural, contexto largo, y fallback de metadatos para underground |
| Grafo | D3.js | Control total sobre visualización, sin abstracciones |
| Hosting | Vercel (frontend) + Railway (backend) | Deploy simple, escala automática |
| CI/CD | GitHub Actions | Estándar, integración nativa con Vercel |

---

## 12. Consideraciones de Seguridad y Privacidad

- Autenticación via Supabase Auth (email + OAuth)
- Bibliotecas musicales son privadas por defecto (RLS en Supabase)
- Spotify tokens manejados server-side, nunca expuestos al cliente
- Claude API key solo en backend, nunca en frontend
- No se almacenan archivos de audio, solo metadatos y referencias
- GDPR — **eliminación:** borrar la cuenta en Supabase Auth elimina en cascada tracks, tags, playlists y jobs (`ON DELETE CASCADE` en todas las FK a `auth.users`)
- GDPR — **exportación:** endpoint `GET /auth/me/export` (devuelve toda la biblioteca del usuario en JSON). *Implementación: Fase 1 tardía / Fase 2.*

---

## 13. Definición de Done (DoD)

Una funcionalidad está "done" cuando:
- [ ] Código en rama `main` sin conflictos
- [ ] Tests unitarios con coverage > 70%
- [ ] Funciona en Chrome, Firefox y Safari
- [ ] Responsive en mobile (aunque no sea prioridad en MVP)
- [ ] Sin errores en consola de producción
- [ ] Documentado en este PRD si hay cambios de spec

---

*PRD vivo — actualizar con cada sprint. Owner: equipo Serendipia.*
