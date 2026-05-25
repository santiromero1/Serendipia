# Serendipia — Implementation Spec
> Versión 1.0 · Mayo 2026
> Estado: Draft
> Contexto: Desarrollador único, MVP primero, velocidad sobre perfección

---

## 1. Principios de Implementación

**1. Vertical slices, no capas.** No construir todo el backend y después el frontend. Construir una feature completa (backend + frontend) por sprint y que funcione de punta a punta.

**2. Hardcodear antes de abstraer.** Si algo va a tener una sola implementación en MVP, no crear abstracciones genéricas. Abstraer cuando aparece el segundo caso de uso.

**3. Commit atómico por feature.** Cada commit deja el sistema en estado funcional. Nunca commitear trabajo a medias.

**4. Data-testid desde el arranque.** Agregar `data-testid` a todos los elementos interactivos mientras se construyen. Cuesta 5 segundos ahora y evita reescribir tests después.

**5. Variables de entorno validadas al arrancar.** El servidor no arranca si falta alguna env var crítica. Falla rápido, no en producción.

---

## 2. Setup Inicial (Día 0 — antes de tocar código de producto)

### 2.1 Repositorio

```bash
# Crear repo en GitHub, clonar, inicializar monorepo
git clone git@github.com:tu-usuario/serendipia.git
cd serendipia

# Inicializar workspace
npm init -y
npm install turbo --save-dev

# Crear estructura base
mkdir -p apps/web apps/api packages/types
```

**`turbo.json`:**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "test": { "dependsOn": ["^build"] },
    "lint": {}
  }
}
```

**`package.json` (root):**
```json
{
  "name": "serendipia",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint"
  }
}
```

---

### 2.2 Supabase

1. Crear proyecto en [supabase.com](https://supabase.com) → nombre: `serendipia`
2. Ir a SQL Editor y ejecutar las migraciones en orden:

```sql
-- 001_create_tracks.sql
CREATE TABLE tracks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  artist          TEXT NOT NULL,
  bpm             INTEGER,
  key_camelot     TEXT,
  key_standard    TEXT,
  energy          DECIMAL(4,3),
  danceability    DECIMAL(4,3),
  valence         DECIMAL(4,3),
  year            INTEGER,
  genre           TEXT[] DEFAULT '{}',
  duration_ms     INTEGER,
  spotify_id      TEXT,
  metadata_status TEXT NOT NULL DEFAULT 'pending'
                  CHECK (metadata_status IN ('pending','enriched','ai_inferred','manual')),
  metadata_source TEXT NOT NULL DEFAULT 'manual'
                  CHECK (metadata_source IN ('spotify','getsongbpm','ai','manual','rekordbox')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de performance
CREATE INDEX idx_tracks_user_id    ON tracks(user_id);
CREATE INDEX idx_tracks_bpm        ON tracks(bpm);
CREATE INDEX idx_tracks_key        ON tracks(key_camelot);
CREATE INDEX idx_tracks_energy     ON tracks(energy);
CREATE UNIQUE INDEX idx_tracks_unique
  ON tracks(user_id, LOWER(title), LOWER(artist));

-- RLS
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_tracks" ON tracks
  FOR ALL USING (auth.uid() = user_id);

-- 002_create_track_tags.sql
CREATE TABLE track_tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id    UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  tag         TEXT NOT NULL,
  tag_type    TEXT NOT NULL DEFAULT 'moment'
              CHECK (tag_type IN ('moment','genre','custom')),
  source      TEXT NOT NULL DEFAULT 'ai'
              CHECK (source IN ('ai','user')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_track_tags_track_id ON track_tags(track_id);

ALTER TABLE track_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_tags" ON track_tags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM tracks WHERE tracks.id = track_tags.track_id AND tracks.user_id = auth.uid())
  );

-- 003_create_playlists.sql
CREATE TABLE playlists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_playlists" ON playlists
  FOR ALL USING (auth.uid() = user_id);

-- 004_create_playlist_tracks.sql
CREATE TABLE playlist_tracks (
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  track_id    UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (playlist_id, track_id)
);

ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_playlist_tracks" ON playlist_tracks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM playlists WHERE playlists.id = playlist_tracks.playlist_id AND playlists.user_id = auth.uid())
  );

-- 005_create_import_jobs.sql
CREATE TABLE import_jobs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'processing'
               CHECK (status IN ('processing','completed','failed')),
  total        INTEGER NOT NULL DEFAULT 0,
  processed    INTEGER NOT NULL DEFAULT 0,
  enriched     INTEGER NOT NULL DEFAULT 0,
  ai_inferred  INTEGER NOT NULL DEFAULT 0,
  failed       INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_jobs" ON import_jobs
  FOR ALL USING (auth.uid() = user_id);

-- 006_updated_at_trigger.sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tracks_updated_at
  BEFORE UPDATE ON tracks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER playlists_updated_at
  BEFORE UPDATE ON playlists FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

3. Guardar en `/apps/api/supabase/migrations/` para tener historial

---

### 2.3 APIs Externas

**Spotify** (solo identidad/catálogo — audio-features ya no está disponible):
1. Ir a [developer.spotify.com](https://developer.spotify.com/dashboard)
2. Crear app → nombre: `Serendipia`
3. Copiar `Client ID` y `Client Secret`
4. El flujo de auth para server-to-server es **Client Credentials** (sin login de usuario)
5. Usar solo `search` y endpoints de track/artist (NO `audio-features`/`audio-analysis`, deprecados para apps nuevas)

**GetSongBPM** (BPM + clave musical):
1. Solicitar API key en [getsongbpm.com/api](https://getsongbpm.com/api)
2. Guardar en 1Password
3. Requiere un backlink a getsongbpm.com en el sitio (condición de su API gratuita) — agregarlo en el footer

**Anthropic:**
1. Ir a [console.anthropic.com](https://console.anthropic.com)
2. Crear API key → guardar en 1Password inmediatamente
3. Modelos: `claude-sonnet-4-6` (inferencia de fallback / chat Fase 3), `claude-haiku-4-5` (tags DJ de alto volumen)

---

### 2.4 Variables de Entorno

**`apps/api/.env`:**
```bash
PORT=3001
NODE_ENV=development

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...     # para el cliente por-request con JWT del usuario (RLS aplica)
SUPABASE_SERVICE_KEY=eyJ...  # service_role: SOLO workers de background, NUNCA frontend

# Spotify (solo identidad/catálogo)
SPOTIFY_CLIENT_ID=xxxxx
SPOTIFY_CLIENT_SECRET=xxxxx

# GetSongBPM (BPM + clave)
GETSONGBPM_API_KEY=xxxxx

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

**`apps/web/.env`:**
```bash
VITE_API_URL=http://localhost:3001/v1
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...  # anon key, es pública por diseño
```

**Validación al arrancar el servidor:**
```typescript
// apps/api/src/config.ts
import { z } from 'zod'

const envSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_KEY: z.string().min(1),
  SPOTIFY_CLIENT_ID: z.string().min(1),
  SPOTIFY_CLIENT_SECRET: z.string().min(1),
  GETSONGBPM_API_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
})

export const config = envSchema.parse(process.env)
// Si falta alguna → lanza error y el servidor no arranca
```

---

## 3. Orden de Implementación — Fase 1 (MVP)

Cada ítem es un vertical slice completo: backend + frontend + smoke test manual.

### Sprint 1 — Semanas 1–2: Fundación

**Objetivo:** Servidor funcionando, auth, y poder agregar el primer track.

```
[ ] 1.1 Setup monorepo completo (Turborepo + workspaces)
[ ] 1.2 Backend: Express + TypeScript + validación de env vars
[ ] 1.3 Backend: Middleware de auth (validar JWT con supabase.auth.getUser + crear cliente Supabase por-request con el JWT → RLS aplica)
[ ] 1.4 Backend: POST /tracks (sin enriquecimiento aún, solo insertar)
[ ] 1.5 Backend: GET /tracks (sin filtros aún, solo listar)
[ ] 1.6 Frontend: Vite + React + Tailwind + React Router setup
[ ] 1.7 Frontend: Auth flow (login/registro via Supabase Auth UI)
[ ] 1.8 Frontend: Página de biblioteca vacía con layout base
[ ] 1.9 Frontend: Formulario "Agregar track" conectado a POST /tracks
[ ] 1.10 Frontend: Lista de tracks conectada a GET /tracks
[ ] 1.11 Deploy: Frontend en Vercel + Backend en Railway
```

**Definition of Done del Sprint 1:**
Un DJ puede registrarse, agregar un track a mano y verlo en su biblioteca. Deployed en producción.

---

### Sprint 2 — Semanas 3–4: Metadatos automáticos

**Objetivo:** El sistema enriquece tracks automáticamente con Spotify y Claude.

```
[ ] 2.1 Backend: Spotify service (Client Credentials auth + search → identidad/catálogo)
[ ] 2.1b Backend: GetSongBPM service (lookup artist+title → BPM + clave)
[ ] 2.2 Backend: Camelot conversion util (key/mode o string musical → Camelot)
[ ] 2.3 Backend: Claude service (inferencia de fallback + generate DJ tags)
[ ] 2.4 Backend: Enrichment pipeline híbrido integrado en POST /tracks (Spotify → GetSongBPM → Claude fallback; tags async)
[ ] 2.5 Backend: Fallback a Claude para campos sin match (energy/danceability, o BPM/clave underground)
[ ] 2.6 Backend: PUT /tracks/:id (edición manual)
[ ] 2.7 Backend: DELETE /tracks/:id
[ ] 2.8 Backend: POST /tracks/:id/tags + DELETE /tracks/:id/tags/:tagId
[ ] 2.9 Frontend: Track card completa (BPM, clave, energía, tags, badge de fuente)
[ ] 2.10 Frontend: Panel lateral "Agregar track" con preview de metadatos
[ ] 2.11 Frontend: Badge visual según metadata_status
[ ] 2.12 Frontend: Edición inline de campos de un track
```

**Definition of Done del Sprint 2:**
Agregás "Sandstorm - Darude" y en menos de 5 segundos ves BPM 136, clave Bbm, energía 0.87 y los tags `[explotarla] [peak]` generados automáticamente.

---

### Sprint 3 — Semanas 5–6: Filtros, importación y playlists

**Objetivo:** La biblioteca es navegable. Podés importar tu colección y organizar sets.

```
[ ] 3.1 Backend: GET /tracks con todos los filtros del API Spec
[ ] 3.2 Backend: POST /tracks/import/xml (parseo + job en background)
[ ] 3.3 Backend: POST /tracks/import/csv
[ ] 3.4 Backend: GET /tracks/import/jobs/:jobId (polling)
[ ] 3.5 Backend: CRUD completo de playlists
[ ] 3.6 Backend: GET /playlists/:id/export (XML + M3U)
[ ] 3.7 Frontend: Sidebar de filtros (BPM slider, Camelot picker, energía, tags)
[ ] 3.8 Frontend: Filtros con debounce + URL state (compartibles)
[ ] 3.9 Frontend: Vista lista compacta (toggle grid/lista)
[ ] 3.10 Frontend: Modal de importación XML con barra de progreso (polling)
[ ] 3.11 Frontend: CRUD de playlists en sidebar
[ ] 3.12 Frontend: Agregar/quitar tracks de playlist (drag o botón)
[ ] 3.13 Frontend: Exportar playlist (botón → descarga archivo)
[ ] 3.14 Frontend: Estado vacío (primera vez sin tracks)
```

**Definition of Done del Sprint 3:**
Importás tu biblioteca de Rekordbox, la filtrás por BPM + clave, armás un set en una playlist y la exportás como XML que Rekordbox puede leer.

---

## 4. Orden de Implementación — Fase 2 (Grafo)

> No arrancar hasta que Fase 1 esté deployed y validado con usuarios reales.

```
[ ] 4.1 Backend: Algoritmo de compatibilityScore (bpm + camelot + energy)
[ ] 4.2 Backend: Job de cálculo de conexiones (batch, post-import)
[ ] 4.3 Backend: GET /tracks/:id/connections
[ ] 4.4 Backend: POST /connections/compute
[ ] 4.5 Frontend: Vista Grafo base con D3.js (nodos + conexiones)
[ ] 4.6 Frontend: Hover en nodo → resalta conexiones
[ ] 4.7 Frontend: Click en nodo → panel de detalle
[ ] 4.8 Frontend: Filtros de biblioteca aplicados al grafo
[ ] 4.9 Frontend: Colores de nodo según energía
[ ] 4.10 Frontend: Scatter Map (energía vs danceability)
[ ] 4.11 Frontend: Sidebar colapsa automáticamente en vista grafo
```

---

## 5. Orden de Implementación — Fase 3 (IA Conversacional)

> No arrancar hasta que Fase 2 esté deployed y validado.

```
[ ] 5.1 Backend: POST /chat con sistema de traducción query → filtros
[ ] 5.2 Backend: Contexto de biblioteca en el prompt de Claude
[ ] 5.3 Backend: Historial de sesión de chat
[ ] 5.4 Frontend: Panel de chat (slide-in desde la derecha)
[ ] 5.5 Frontend: Mensajes con track cards embebidas
[ ] 5.6 Frontend: Chips de sugerencias rápidas
[ ] 5.7 Frontend: Shortcut ⌘/ para abrir/cerrar
```

---

## 6. Convenciones de Código

### Naming
```typescript
// Archivos: kebab-case
spotify.service.ts
track.controller.ts
use-tracks.hook.ts

// Componentes React: PascalCase
TrackCard.tsx
LibraryFilters.tsx

// Variables y funciones: camelCase
const trackList = []
function enrichTrackMetadata() {}

// Constantes: UPPER_SNAKE_CASE
const MAX_IMPORT_SIZE_MB = 50
const SPOTIFY_RATE_LIMIT_MS = 700
```

### Estructura de un endpoint (patrón a seguir)

```typescript
// routes/tracks.ts — solo define la ruta
router.post('/', authenticate, validate(createTrackSchema), createTrack)

// controllers/tracks.controller.ts — maneja request/response
export const createTrack = async (req: Request, res: Response) => {
  const track = await TrackService.create(req.body, req.user.id)
  res.status(201).json({ data: track })
}

// services/track.service.ts — lógica de negocio
export class TrackService {
  static async create(input: CreateTrackInput, userId: string): Promise<Track> {
    // lógica acá
  }
}
```

### Manejo de errores (patrón único)

```typescript
// middleware/errorHandler.ts
export function errorHandler(err: AppError, req: Request, res: Response) {
  const status = err.statusCode ?? 500
  res.status(status).json({
    error: {
      code: err.code ?? 'INTERNAL_ERROR',
      message: err.message,
    }
  })
}

// Cómo lanzar errores desde cualquier lugar
throw new AppError('TRACK_NOT_FOUND', 404, 'El track no existe')
```

---

## 7. Git — Branching y Commits

### Branches
```
main          ← producción, siempre deployable
dev           ← integración, base para features
feat/xxx      ← features nuevas
fix/xxx       ← bugfixes
```

### Commit format
```
feat: agregar endpoint POST /tracks con enriquecimiento Spotify
fix: corregir conversión de clave Bbm en tabla Camelot
chore: configurar Turborepo y workspaces iniciales
test: agregar unit tests para compatibilityScore
```

### Flujo de trabajo diario
```bash
git checkout dev
git pull origin dev
git checkout -b feat/track-enrichment
# ... trabajar ...
git add -p                    # agregar cambios selectivamente
git commit -m "feat: ..."
git push origin feat/track-enrichment
# PR a dev → merge → deploy automático a staging
# Cuando dev está estable → PR a main → deploy a producción
```

---

## 8. Checklist por Feature Completada

Antes de considerar una tarea del sprint como "done":

```
[ ] El endpoint responde con el schema del API Spec
[ ] Errores retornan el formato estándar { error: { code, message } }
[ ] El componente tiene data-testid en todos los elementos interactivos
[ ] No hay console.log() en el código committed
[ ] Las env vars nuevas están en .env.example
[ ] TypeScript compila sin errores (tsc --noEmit)
[ ] Smoke test manual: flujo completo funciona en local
```

---

## 9. Decisiones de Implementación Ya Tomadas

> Estas decisiones están cerradas para MVP. No re-discutir.

| Decisión | Detalle |
|---------|---------|
| Auth | Supabase Auth. Backend crea cliente Supabase **por-request con el JWT del usuario** (RLS aplica). `service_role` solo en workers de background, filtrando `user_id` a mano. |
| Fuente de metadatos | Híbrida: Spotify (identidad) → GetSongBPM (BPM/clave) → Claude (fallback). Spotify audio-features NO se usa (deprecado). |
| Enriquecimiento | Metadatos **síncronos ≤ 4s** (Spotify + GetSongBPM + Claude fallback). DJ tags **async en background**. Import masivo: todo async con job. |
| Progreso de import | Polling cada 2s a `GET /tracks/import/jobs/:jobId`. Sin WebSockets en MVP. |
| Camelot | Tabla estática hardcodeada + score graduado (1.0 / 0.8 / 0). No librería externa. |
| DJ Tags | Claude genera, usuario puede editar. Nunca regenerar si ya existen. |
| Cache de metadatos | Guardar `spotify_id` + BPM/clave en DB. Si ya existen, no volver a llamar APIs externas. |
| Paginación | Offset-based en MVP. Migrar a cursor-based si aparecen problemas de performance. |
| Error logging | Winston a stdout en dev, JSON estructurado en prod. Sin Sentry en MVP. |

---

*Implementation Spec — actualizar con decisiones tomadas durante el desarrollo.*