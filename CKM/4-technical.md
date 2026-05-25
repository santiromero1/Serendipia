# Serendipia — Technical Spec
> Versión 1.0 · Mayo 2026
> Estado: Draft
> Contexto: Desarrollador único, balance velocidad / calidad

---

## 1. Principios Técnicos

**1. Un solo dev, máxima palanca.** Cada decisión tecnológica se evalúa contra cuánto tiempo libera, no cuánto impresiona.

**2. Hosted sobre self-hosted.** Supabase, Vercel, Railway — servicios gestionados por defecto. Infra propia solo cuando el costo lo justifica.

**3. Tipado de punta a punta.** TypeScript en frontend y backend. Un bug de tipos en dev vale menos que uno en producción con datos reales de un DJ.

**4. API-first.** El backend expone contratos claros. El frontend los consume. Nunca lógica de negocio en el cliente.

**5. Complejidad diferida.** El grafo, la IA conversacional y la integración directa con SQLite de Rekordbox son Fase 2+. El MVP no los necesita para validar.

---

## 2. Arquitectura General

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENTE                             │
│              React + Vite + TypeScript                  │
│         TanStack Query · Zustand · D3.js (F2)           │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTPS / REST
┌─────────────────────────▼───────────────────────────────┐
│                      API                                │
│              Node.js + Express + TypeScript             │
│         Zod validation · Winston logs · JWT auth        │
└──────┬────────────────────────────────┬─────────────────┘
       │                                │
┌──────▼──────────┐          ┌──────────▼──────────────┐
│    Supabase     │          │     APIs Externas        │
│  PostgreSQL     │          │                          │
│  Auth (JWT)     │          │  Spotify  (identidad)    │
│  Storage        │          │  GetSongBPM (BPM/clave)  │
│  Row Level Sec. │          │  Anthropic Claude        │
│                 │          │   (fallback + DJ tags)   │
└─────────────────┘          └──────────────────────────┘
```

---

## 3. Stack Detallado y Justificación

### Frontend

| Tecnología | Versión | Por qué |
|-----------|---------|---------|
| React | 19 | Ecosistema, familiaridad, soporte largo plazo |
| Vite | 6 | Build rápido, HMR instantáneo, zero config |
| TypeScript | 5.4+ | Tipos de punta a punta con el backend |
| Tailwind CSS | 4 | Diseño rápido, consistente con el Design Spec |
| TanStack Query | 5 | Server state, cache, loading/error states sin boilerplate |
| Zustand | 5 | UI state simple (panel abierto, track seleccionado, filtros) |
| React Router | 7 | Routing con URL state para filtros compartibles |
| D3.js | 7 | Grafo de conexiones (Fase 2) — control total sobre SVG |
| Zod | 3 | Validación de tipos compartida con backend |

### Backend

| Tecnología | Versión | Por qué |
|-----------|---------|---------|
| Node.js | 22 LTS | JS full-stack, mismo lenguaje que el frontend |
| Express | 5 | Minimal, conocido, fácil de escalar cuando haga falta |
| TypeScript | 5.4+ | Tipos de punta a punta |
| Zod | 3 | Validación de request/response + tipos inferidos |
| Winston | 3 | Logs estructurados (JSON) listos para producción |
| node-xml2js | 0.6 | Parseo de XML de Rekordbox |
| @anthropic-ai/sdk | latest | Claude API oficial (modelo `claude-sonnet-4-6` para inferencia/chat, `claude-haiku-4-5` para tags DJ de alto volumen) |
| GetSongBPM API | REST | Fuente dedicada de BPM + clave musical. Cliente HTTP propio (no hay SDK oficial) |

### Base de Datos

| Tecnología | Por qué |
|-----------|---------|
| Supabase | PostgreSQL gestionado + Auth + Storage + RLS + Dashboard. Un solo servicio reemplaza DB + auth + file storage. Free tier generoso para MVP. |
| Row Level Security | Cada usuario solo ve su propia biblioteca — seguridad a nivel DB sin lógica extra en el backend |

### Infraestructura

| Servicio | Uso | Por qué |
|---------|-----|---------|
| Vercel | Frontend | Deploy automático en cada push a `main`, CDN global, zero config |
| Railway | Backend (API) | Más simple que AWS/GCP para un solo dev. Sleep mode en free tier aceptable para MVP |
| Supabase | DB + Auth | Ver arriba |
| GitHub | Repo + CI/CD | GitHub Actions para lint, typecheck y test en cada PR |

---

## 4. Estructura del Monorepo

```
serendipia/
├── README.md
├── CKM/                          ← Specs (este archivo vive acá)
├── package.json                  ← Root: scripts de workspace
├── turbo.json                    ← Turborepo para builds incrementales
├── .env.example
│
├── apps/
│   ├── web/                      ← Frontend React
│   │   ├── src/
│   │   │   ├── components/       ← UI components
│   │   │   │   ├── ui/           ← Base components (Button, Input, Badge)
│   │   │   │   ├── track/        ← TrackCard, TrackList, TrackDetail
│   │   │   │   ├── library/      ← LibraryGrid, LibraryFilters
│   │   │   │   ├── graph/        ← GraphView, GraphNode (Fase 2)
│   │   │   │   └── chat/         ← ChatPanel, ChatMessage (Fase 3)
│   │   │   ├── pages/            ← Library, Graph, Settings
│   │   │   ├── hooks/            ← useTracks, useFilters, useChat
│   │   │   ├── stores/           ← Zustand stores (ui.store, filter.store)
│   │   │   ├── lib/              ← api client, queryClient, utils
│   │   │   └── types/            ← Re-exports de @serendipia/types
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── api/                      ← Backend Express
│       ├── src/
│       │   ├── routes/           ← tracks.ts, playlists.ts, chat.ts
│       │   ├── controllers/      ← Lógica de cada ruta
│       │   ├── services/         ← spotify.ts, claude.ts, rekordbox.ts
│       │   ├── middleware/        ← auth.ts, validate.ts, errorHandler.ts
│       │   ├── db/               ← supabase client, queries
│       │   └── index.ts          ← Entry point
│       └── package.json
│
└── packages/
    └── types/                    ← @serendipia/types (compartido)
        ├── src/
        │   ├── track.ts
        │   ├── playlist.ts
        │   └── api.ts
        └── package.json
```

---

## 5. Seguridad

### Autenticación
- Supabase Auth maneja registro, login y emisión de JWT
- El backend **valida** el JWT en cada request via middleware con `supabase.auth.getUser(token)` (no se firma ni verifica con un secreto propio)
- Las API keys (Spotify, GetSongBPM, Claude) viven solo en el backend — nunca expuestas al cliente

### Aislamiento entre usuarios — cliente Supabase por-request (RLS activo)

> **Decisión clave de seguridad.** El backend **no** usa la `service_role` key para las queries de datos de usuario, porque esa key **bypassa el RLS** (`auth.uid()` queda nulo y las políticas no se evalúan).

- Para cada request autenticado, el backend crea un **cliente Supabase con el JWT del usuario** (anon key + header `Authorization: Bearer <jwt>`). Así `auth.uid()` resuelve al usuario real y las políticas RLS se aplican de verdad.
- La `service_role` key se reserva **solo** para workers de background (ej. enriquecimiento post-import) que corren fuera de un request de usuario. Esos workers **deben** filtrar `user_id` explícitamente en cada query, ya que con service_role el RLS no protege.

```typescript
// db/supabase.ts — cliente por-request, RLS aplica
export function userClient(jwt: string) {
  return createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  })
}
```

### Row Level Security (Supabase)
```sql
-- Política base: cada usuario ve solo sus propios tracks
CREATE POLICY "users_own_tracks" ON tracks
  FOR ALL USING (auth.uid() = user_id);

-- Igual para playlists
CREATE POLICY "users_own_playlists" ON playlists
  FOR ALL USING (auth.uid() = user_id);
```

### Variables de entorno
```bash
# Backend (.env)
SUPABASE_URL=
SUPABASE_ANON_KEY=            # Para el cliente por-request con JWT del usuario (RLS aplica)
SUPABASE_SERVICE_KEY=         # Solo para workers de background, nunca en frontend
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
GETSONGBPM_API_KEY=
ANTHROPIC_API_KEY=

# Frontend (.env)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=       # Anon key es pública por diseño
VITE_API_URL=
```

---

## 6. Flujos Técnicos Clave

### 6.1 Enriquecimiento de un Track

El pipeline es **híbrido**: cada fuente aporta lo que mejor sabe. La respuesta sincrónica trae los metadatos; los DJ tags se generan en background y no bloquean.

```
Cliente              API            Spotify      GetSongBPM       Claude
   │                  │                │              │              │
   │── POST /tracks ──▶│                │              │              │
   │   { title,artist}│                │              │              │
   │                  │── search ─────▶│              │              │   (1) identidad:
   │                  │◀─ id,año,dur, ─│              │              │       título canónico,
   │                  │   género,art   │              │              │       año, duración, género
   │                  │                │              │              │
   │                  │── lookup(artist+title) ──────▶│              │   (2) BPM + clave
   │                  │◀─ { bpm, key } ──────────────│              │
   │                  │                │              │              │
   │                  │  [campos DJ que faltan: energy/danceability, │
   │                  │   o BPM/clave si GetSongBPM no tuvo match]    │
   │                  │── infer missing fields ──────────────────────▶│  (3) fallback IA
   │                  │◀─ { bpm?, key?, energy, danceability... } ────│
   │                  │                                               │
   │                  │── INSERT track (status: enriched|ai_inferred)─▶ (Supabase)
   │◀─ 201 { track } ─│   (≤ 4s — metadatos listos, tags aún vacíos)  │
   │                  │                                               │
   │                  │·· background: generate_dj_tags() ────────────▶│  (4) tags async
   │                  │·· UPDATE track_tags ─────────▶ (Supabase)     │
   │   (el cliente refetchea GET /tracks/:id y ve los tags)           │
```

**Presupuesto de latencia:**
- Spotify + GetSongBPM son llamadas HTTP rápidas → enriquecimiento sincrónico objetivo **≤ 4s**.
- Los **DJ tags (Claude) se generan en background**, no bloquean la respuesta. El track vuelve con `tags: []` y se completa a los pocos segundos (el cliente refetchea o usa optimistic UI).
- Si Spotify no encuentra el track, igual se intenta GetSongBPM + Claude (camino underground).

**Manejo de rate limits:**
- Spotify / GetSongBPM: para importaciones masivas, procesar en lotes de 20 con delay configurable (~700ms) entre lotes. Constante `SPOTIFY_RATE_LIMIT_MS`.
- Claude: cola de prioridad. La inferencia de fallback y los tags se encolan; nunca bloquean el request del usuario.
- **Cache:** si un track ya tiene `spotify_id` o BPM/clave guardados, no se vuelve a consultar la API externa.

### 6.2 Importación XML de Rekordbox

```typescript
// Flujo simplificado
async function importRekordboxXML(xmlBuffer: Buffer, userId: string) {
  // 1. Parsear XML
  const collection = await parseRekordboxXML(xmlBuffer)
  // → Array de { title, artist, bpm, key, genre, ... }

  // 2. Detectar duplicados (por title + artist)
  const existing = await db.getTitleArtistPairs(userId)
  const newTracks = collection.filter(t =>
    !existing.has(`${t.title}::${t.artist}`)
  )

  // 3. Insertar tracks con metadatos de Rekordbox como base
  const inserted = await db.batchInsertTracks(newTracks, userId)

  // 4. Encolar enriquecimiento en background
  await enrichmentQueue.addBatch(inserted.map(t => t.id))

  // 5. Responder inmediatamente con progreso via SSE o polling
  return { total: newTracks.length, jobId: enrichmentQueue.jobId }
}
```

**Estrategia de progreso:**
- El cliente hace polling a `GET /api/tracks/import/jobs/:jobId` cada 2 segundos
- La respuesta incluye `{ processed, total, status }`
- Sin websockets en MVP — polling es suficiente y más simple

### 6.3 Cálculo de Compatibilidad (Fase 2)

```typescript
// Compatibilidad de clave: una sola función graduada, usada en todos lados.
// Misma clave o adyacente ±1 en la rueda → 1.0
// Cambio de modo en la misma posición (relativa mayor/menor, ej. 8A↔8B) → 0.8
// Todo lo demás → 0
function camelotCompatibilityScore(a: string, b: string): number {
  if (!a || !b) return 0
  const numA = parseInt(a), letterA = a.slice(-1)
  const numB = parseInt(b), letterB = b.slice(-1)
  const adjacent = (x: number, y: number) =>
    x === y || ((x % 12) + 1) === y || ((y % 12) + 1) === x  // wrap 12↔1

  if (letterA === letterB) return adjacent(numA, numB) ? 1.0 : 0
  return numA === numB ? 0.8 : 0   // mismo número, distinto modo
}

function compatibilityScore(a: Track, b: Track): number {
  const bpmDiff = Math.abs(a.bpm - b.bpm)
  const bpmScore = bpmDiff <= 8 ? 1 - bpmDiff / 8 : 0

  const keyScore = camelotCompatibilityScore(a.key_camelot, b.key_camelot)

  const energyScore = 1 - Math.abs(a.energy - b.energy)

  return bpmScore * 0.4 + keyScore * 0.4 + energyScore * 0.2
}

// Recalcular conexiones: job batch nocturno o al agregar tracks nuevos
// Solo se almacenan conexiones con score > 0.65
```

---

## 7. Manejo de Errores

### Categorías de error

```typescript
// packages/types/src/api.ts
export type ApiError = {
  code: ErrorCode
  message: string
  details?: unknown
}

export enum ErrorCode {
  // Auth
  UNAUTHORIZED        = 'UNAUTHORIZED',
  FORBIDDEN           = 'FORBIDDEN',
  // Tracks
  TRACK_NOT_FOUND     = 'TRACK_NOT_FOUND',
  TRACK_DUPLICATE     = 'TRACK_DUPLICATE',
  // Metadata
  SPOTIFY_NOT_FOUND   = 'SPOTIFY_NOT_FOUND',
  SPOTIFY_RATE_LIMIT  = 'SPOTIFY_RATE_LIMIT',
  METADATA_FAILED     = 'METADATA_FAILED',
  // Import
  XML_PARSE_ERROR     = 'XML_PARSE_ERROR',
  XML_INVALID_FORMAT  = 'XML_INVALID_FORMAT',
  // General
  VALIDATION_ERROR    = 'VALIDATION_ERROR',
  INTERNAL_ERROR      = 'INTERNAL_ERROR',
}
```

### En el cliente
- Errores de red: TanStack Query reintenta 3 veces con backoff exponencial
- Errores de validación (400): se muestran inline en el formulario
- Errores de servidor (500): toast global con opción de reintentar
- Spotify no encontrado: se muestra en la UI como badge `~ No encontrado` con opción de editar manualmente

---

## 8. Performance

### Frontend
- **Code splitting** por ruta: la vista Grafo (D3.js pesado) carga lazy
- **Virtualización** de lista: `@tanstack/react-virtual` para bibliotecas de 1000+ tracks
- **Debounce** en filtros: 300ms antes de disparar nueva query
- **Optimistic updates**: agregar un track aparece en la UI antes de confirmar el server

### Backend
- **Índices en PostgreSQL:**
```sql
CREATE INDEX idx_tracks_user_id ON tracks(user_id);
CREATE INDEX idx_tracks_bpm ON tracks(bpm);
CREATE INDEX idx_tracks_key_camelot ON tracks(key_camelot);
CREATE INDEX idx_tracks_energy ON tracks(energy);
CREATE INDEX idx_track_tags_track_id ON track_tags(track_id);
CREATE INDEX idx_track_tags_tag ON track_tags(tag);
```
- **Paginación** en `GET /tracks`: cursor-based, page size 50
- **Procesamiento batch** para Spotify: lotes de 20, no requests individuales

---

## 9. Testing

### Estrategia (pragmática para un solo dev)

| Tipo | Herramienta | Cobertura objetivo |
|------|-------------|-------------------|
| Unit (servicios) | Vitest | Lógica de Camelot, parseo XML, score de compatibilidad |
| Integration (API) | Supertest + Vitest | Endpoints críticos: POST /tracks, import XML |
| E2E (flujos clave) | Playwright | Agregar track, importar XML, filtrar biblioteca |
| Types | TypeScript strict | 100% — el compilador es el primer test |

### Flujos E2E prioritarios
1. Usuario agrega un track y ve metadatos generados
2. Usuario importa XML de Rekordbox y ve progreso
3. Usuario filtra biblioteca por BPM + clave y los resultados son correctos
4. Usuario arma una playlist y la exporta como XML

---

## 10. Decisiones Técnicas Registradas

| Decisión | Alternativa descartada | Razón |
|---------|----------------------|-------|
| Metadatos híbridos: Spotify (identidad) + GetSongBPM (BPM/clave) + Claude (fallback + tags) | Solo Spotify | Spotify deprecó audio-features para apps nuevas; ninguna fuente sola cubre underground + datos precisos |
| Auth: cliente Supabase **por-request con el JWT del usuario** (RLS activo) | service_role en todo el backend | service_role bypassa RLS; el JWT por-request mantiene el aislamiento a nivel DB |
| Monorepo con Turborepo | Repos separados | Un solo dev, tipos compartidos, builds incrementales |
| Express sobre Fastify / Hono | Fastify, Hono | Más conocido, más ejemplos, suficiente para MVP |
| Polling sobre WebSockets | WS / SSE | Menos complejidad en MVP. Migrar a SSE en Fase 2 si el UX lo pide |
| TanStack Query sobre SWR | SWR | Más features de cache y mutations, mejor DX |
| Zustand sobre Redux / Jotai | Redux | Mínimo boilerplate para un solo dev |
| Supabase sobre PlanetScale / Neon | PlanetScale | Auth incluida, Storage incluido, RLS nativo |
| Railway sobre Render / Fly | Render | Mejor DX, deploys más rápidos, pricing más claro |

---

## 11. Riesgos Técnicos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|-----------|
| Spotify audio-features **ya deprecado** para apps nuevas (nov-2024) | Hecho | Alto | **Resuelto en arquitectura:** BPM/clave vía GetSongBPM, energy/danceability y underground vía Claude. Spotify queda solo para identidad/catálogo. |
| GetSongBPM sin match para tracks underground/edits | Alta | Medio | Fallback a inferencia de Claude (ya en el pipeline) |
| Rate limits de Spotify / GetSongBPM en importaciones masivas | Alta | Medio | Queue + batch (lotes de 20) + delays configurados |
| Rekordbox cambia formato XML | Baja | Alto | Tests de parseo con fixtures de versiones reales |
| Costo de Claude API en producción | Media | Medio | Cache de tags generados, no regenerar si ya existen |
| Supabase free tier se queda corto | Media | Bajo | Migración a Pro es $25/mes, planificada |
| D3.js + 10k nodos = lento | Media | Medio | Cap de nodos visibles (top 500 por relevancia), clustering |

---

## 12. Checklist Pre-Desarrollo

Antes de escribir la primera línea de código:

- [ ] Repo creado en GitHub con estructura de monorepo
- [ ] Proyecto en Supabase creado, tablas migradas, RLS activado
- [ ] App de Spotify creada en Spotify Developer Dashboard (solo search/catálogo — audio-features no disponible)
- [ ] API key de GetSongBPM solicitada
- [ ] API key de Anthropic generada y guardada en 1Password
- [ ] Variables de entorno configuradas en Railway y Vercel
- [ ] GitHub Actions configurado: lint + typecheck en cada PR
- [ ] `.env.example` actualizado con todas las variables necesarias
- [ ] Gate 2 aprobado (Technical + API + Test spec completos)

---

*Technical Spec — documento vivo. Actualizar con cada decisión de arquitectura relevante.*