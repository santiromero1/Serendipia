# Serendipia — Test Spec
> Versión 1.0 · Mayo 2026
> Estado: Draft
> Contexto: Desarrollador único, MVP rápido — testeamos lo que duele si se rompe

---

## 1. Filosofía de Testing

**No testeamos todo. Testeamos lo que importa.**

Para un solo dev con foco en velocidad, la pregunta no es "¿qué debería tener test?" sino "¿qué me costaría más caro si se rompe en producción con datos reales de un DJ?"

La respuesta para Serendipia:

1. La **lógica de Camelot** — si esto falla, las recomendaciones de compatibilidad son basura
2. El **parseo de XML de Rekordbox** — si esto falla, el DJ pierde su biblioteca importada
3. El **enriquecimiento de metadatos** — si el fallback falla, los tracks quedan huérfanos
4. Los **filtros de biblioteca** — si filtran mal, el DJ no encuentra lo que busca
5. La **exportación de playlists** — si el XML exportado no lo lee Rekordbox, el set no llega a la cabina

Todo lo demás — UI, animaciones, edge cases de UX — se valida manualmente o con E2E liviano.

---

## 2. Stack de Testing

| Herramienta | Uso | Por qué |
|-------------|-----|---------|
| **Vitest** | Unit + Integration (backend) | Mismo config que Vite, rápido, compatible con TypeScript sin config extra |
| **Supertest** | HTTP integration tests | Testear endpoints Express sin levantar servidor real |
| **Playwright** | E2E flows críticos | Headless, rápido, API clara |
| **@testing-library/react** | Componentes React | Testear comportamiento, no implementación |
| **MSW (Mock Service Worker)** | Mock de APIs externas | Interceptar Spotify + Claude en tests sin llamadas reales |

---

## 3. Qué NO testear en MVP

Para no perder tiempo en cosas de bajo valor:

- ❌ Componentes de UI puros (botones, inputs, badges) — TypeScript los cubre
- ❌ Queries SQL directas — Supabase las testea, nosotros testeamos la lógica encima
- ❌ Autenticación de Supabase — es su responsabilidad, no la nuestra
- ❌ Animaciones y transiciones — validación manual
- ❌ Happy path de endpoints simples (GET /playlists) — demasiado costo, poco valor
- ❌ 100% de coverage — métrica vanidosa para un solo dev

---

## 4. Unit Tests — Backend

### 4.1 Lógica de Camelot

**Archivo:** `apps/api/src/services/__tests__/camelot.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import {
  spotifyKeyToCamelot,
  camelotCompatibilityScore,
  getCompatibleKeys,
} from '../camelot'

describe('spotifyKeyToCamelot', () => {
  it('convierte key=0 mode=1 (C major) a 8B', () => {
    expect(spotifyKeyToCamelot(0, 1)).toBe('8B')
  })
  it('convierte key=9 mode=0 (A minor) a 8A', () => {
    expect(spotifyKeyToCamelot(9, 0)).toBe('8A')
  })
  it('retorna null si key es -1 (Spotify no detectó)', () => {
    expect(spotifyKeyToCamelot(-1, 0)).toBeNull()
  })
  it('cubre las 24 posiciones de la rueda sin undefined', () => {
    const modes = [0, 1]
    const keys = Array.from({ length: 12 }, (_, i) => i)
    keys.forEach(key => {
      modes.forEach(mode => {
        expect(spotifyKeyToCamelot(key, mode)).toMatch(/^\d{1,2}[AB]$/)
      })
    })
  })
})

describe('camelotCompatibilityScore', () => {
  it('misma clave → score 1.0', () => {
    expect(camelotCompatibilityScore('8A', '8A')).toBe(1.0)
  })
  it('clave adyacente +1 → score 1.0', () => {
    expect(camelotCompatibilityScore('8A', '9A')).toBe(1.0)
  })
  it('clave adyacente -1 → score 1.0', () => {
    expect(camelotCompatibilityScore('8A', '7A')).toBe(1.0)
  })
  it('cambio de modo mismo número (8A → 8B) → score 0.8', () => {
    expect(camelotCompatibilityScore('8A', '8B')).toBe(0.8)
  })
  it('claves incompatibles → score 0', () => {
    expect(camelotCompatibilityScore('8A', '1B')).toBe(0)
  })
  it('wrap-around: 12A es adyacente a 1A', () => {
    expect(camelotCompatibilityScore('12A', '1A')).toBe(1.0)
  })
})

describe('getCompatibleKeys', () => {
  it('retorna 4 claves compatibles para 8A', () => {
    const compatible = getCompatibleKeys('8A')
    expect(compatible).toContain('8A')
    expect(compatible).toContain('7A')
    expect(compatible).toContain('9A')
    expect(compatible).toContain('8B')
    expect(compatible).toHaveLength(4)
  })
})
```

---

### 4.2 Score de Compatibilidad entre Tracks

**Archivo:** `apps/api/src/services/__tests__/compatibility.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { compatibilityScore } from '../compatibility'
import type { Track } from '@serendipia/types'

const baseTrack = (overrides: Partial<Track>): Track => ({
  id: 'uuid',
  user_id: 'user',
  title: 'Test',
  artist: 'Artist',
  bpm: 130,
  key_camelot: '8A',
  key_standard: 'Am',
  energy: 0.8,
  danceability: 0.7,
  valence: 0.5,
  year: 2020,
  genre: [],
  duration_ms: 360000,
  spotify_id: null,
  metadata_status: 'enriched',
  metadata_source: 'spotify',
  notes: null,
  tags: [],
  created_at: '',
  updated_at: '',
  ...overrides,
})

describe('compatibilityScore', () => {
  it('tracks idénticos → score 1.0', () => {
    const t = baseTrack({})
    expect(compatibilityScore(t, t)).toBeCloseTo(1.0)
  })

  it('mismo BPM + clave compatible + energía similar → score alto (>0.85)', () => {
    const a = baseTrack({ bpm: 130, key_camelot: '8A', energy: 0.8 })
    const b = baseTrack({ bpm: 132, key_camelot: '9A', energy: 0.82 })
    expect(compatibilityScore(a, b)).toBeGreaterThan(0.85)
  })

  it('diferencia de BPM > 8 → score BPM es 0', () => {
    const a = baseTrack({ bpm: 130, key_camelot: '8A', energy: 0.8 })
    const b = baseTrack({ bpm: 145, key_camelot: '8A', energy: 0.8 })
    // solo energy + key contribuyen
    expect(compatibilityScore(a, b)).toBeLessThan(0.65)
  })

  it('clave incompatible penaliza significativamente', () => {
    const compatible = compatibilityScore(
      baseTrack({ bpm: 130, key_camelot: '8A', energy: 0.8 }),
      baseTrack({ bpm: 130, key_camelot: '9A', energy: 0.8 })
    )
    const incompatible = compatibilityScore(
      baseTrack({ bpm: 130, key_camelot: '8A', energy: 0.8 }),
      baseTrack({ bpm: 130, key_camelot: '3B', energy: 0.8 })
    )
    expect(compatible).toBeGreaterThan(incompatible)
  })

  it('retorna valor entre 0 y 1 siempre', () => {
    const pairs = [
      [baseTrack({ bpm: 100 }), baseTrack({ bpm: 200 })],
      [baseTrack({ energy: 0.1 }), baseTrack({ energy: 0.9 })],
      [baseTrack({ key_camelot: '1A' }), baseTrack({ key_camelot: '12B' })],
    ]
    pairs.forEach(([a, b]) => {
      const score = compatibilityScore(a, b)
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(1)
    })
  })
})
```

---

### 4.3 Parseo de XML de Rekordbox

**Archivo:** `apps/api/src/services/__tests__/rekordbox.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { parseRekordboxXML } from '../rekordbox'

const VALID_XML_V6 = `<?xml version="1.0" encoding="UTF-8"?>
<DJ_PLAYLISTS Version="1.0.0">
  <PRODUCT Name="rekordbox" Version="6.7.0" Company="AlphaTheta"/>
  <COLLECTION Entries="2">
    <TRACK TrackID="1" Name="Sandstorm" Artist="Darude"
           BPM="136.00" Tonality="Bbm" Genre="Dance"
           Year="1999" TotalTime="224" Location="file://tracks/sandstorm.mp3"/>
    <TRACK TrackID="2" Name="Kernkraft 400" Artist="Zombie Nation"
           BPM="138.00" Tonality="Am" Genre="Techno"
           Year="1999" TotalTime="245" Location="file://tracks/kernkraft.mp3"/>
  </COLLECTION>
</DJ_PLAYLISTS>`

const VALID_XML_V5 = `<?xml version="1.0" encoding="UTF-8"?>
<DJ_PLAYLISTS Version="1.0.0">
  <PRODUCT Name="rekordbox" Version="5.8.6" Company="Pioneer DJ"/>
  <COLLECTION Entries="1">
    <TRACK TrackID="1" Name="Test Track" Artist="Test Artist"
           BPM="128.00" Genre="House" Year="2020"
           TotalTime="300" Location="file://tracks/test.mp3"/>
  </COLLECTION>
</DJ_PLAYLISTS>`

const INVALID_XML = `<not>valid rekordbox xml</not>`
const EMPTY_COLLECTION = `<?xml version="1.0"?>
<DJ_PLAYLISTS Version="1.0.0">
  <COLLECTION Entries="0"></COLLECTION>
</DJ_PLAYLISTS>`

describe('parseRekordboxXML', () => {
  it('parsea XML v6 correctamente', async () => {
    const tracks = await parseRekordboxXML(Buffer.from(VALID_XML_V6))
    expect(tracks).toHaveLength(2)
    expect(tracks[0]).toMatchObject({
      title: 'Sandstorm',
      artist: 'Darude',
      bpm: 136,
      year: 1999,
      genre: 'Dance',
    })
  })

  it('parsea XML v5 correctamente', async () => {
    const tracks = await parseRekordboxXML(Buffer.from(VALID_XML_V5))
    expect(tracks).toHaveLength(1)
    expect(tracks[0].title).toBe('Test Track')
  })

  it('lanza XML_INVALID_FORMAT si no es Rekordbox', async () => {
    await expect(
      parseRekordboxXML(Buffer.from(INVALID_XML))
    ).rejects.toThrow('XML_INVALID_FORMAT')
  })

  it('retorna array vacío para colección vacía', async () => {
    const tracks = await parseRekordboxXML(Buffer.from(EMPTY_COLLECTION))
    expect(tracks).toHaveLength(0)
  })

  it('convierte BPM de string a number', async () => {
    const tracks = await parseRekordboxXML(Buffer.from(VALID_XML_V6))
    expect(typeof tracks[0].bpm).toBe('number')
    expect(tracks[0].bpm).toBe(136)
  })

  it('maneja tracks con campos faltantes sin explotar', async () => {
    const xmlWithMissingFields = `<?xml version="1.0"?>
    <DJ_PLAYLISTS Version="1.0.0">
      <COLLECTION Entries="1">
        <TRACK TrackID="1" Name="Solo titulo" Artist=""/>
      </COLLECTION>
    </DJ_PLAYLISTS>`
    const tracks = await parseRekordboxXML(Buffer.from(xmlWithMissingFields))
    expect(tracks[0].title).toBe('Solo titulo')
    expect(tracks[0].bpm).toBeNull()
  })
})
```

---

### 4.4 Generación de Etiquetas DJ

**Archivo:** `apps/api/src/services/__tests__/djTags.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { generateDJTags, VALID_DJ_TAGS } from '../djTags'

// Mock de Claude API
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '["peak", "explotarla"]' }]
      })
    }
  }
}))

describe('generateDJTags', () => {
  it('retorna tags válidos del set permitido', async () => {
    const tags = await generateDJTags({
      title: 'Kernkraft 400',
      artist: 'Zombie Nation',
      bpm: 138,
      key_camelot: '8A',
      energy: 0.91,
      genre: ['techno'],
    })
    expect(tags.length).toBeGreaterThanOrEqual(1)
    expect(tags.length).toBeLessThanOrEqual(4)
    tags.forEach(tag => {
      expect(VALID_DJ_TAGS).toContain(tag)
    })
  })

  it('filtra tags inválidos que devuelva la IA', async () => {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const instance = new Anthropic()
    vi.mocked(instance.messages.create).mockResolvedValueOnce({
      content: [{ type: 'text', text: '["peak", "tag-inventado", "explotarla"]' }]
    } as any)

    const tags = await generateDJTags({
      title: 'Test', artist: 'Test',
      bpm: 130, key_camelot: '8A', energy: 0.8, genre: [],
    })
    expect(tags).not.toContain('tag-inventado')
  })

  it('retorna array vacío si Claude falla (no lanza)', async () => {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const instance = new Anthropic()
    vi.mocked(instance.messages.create).mockRejectedValueOnce(new Error('API down'))

    const tags = await generateDJTags({
      title: 'Test', artist: 'Test',
      bpm: 130, key_camelot: '8A', energy: 0.8, genre: [],
    })
    expect(tags).toEqual([])
  })
})
```

---

## 5. Integration Tests — API Endpoints

**Setup compartido:** `apps/api/src/__tests__/setup.ts`

```typescript
import { createApp } from '../index'
import supertest from 'supertest'
import { vi } from 'vitest'

// Mock Supabase para tests
vi.mock('../db/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    // etc.
  }
}))

export const app = createApp()
export const request = supertest(app)
export const AUTH_HEADER = { Authorization: 'Bearer test-token-valid' }
```

---

### 5.1 POST /tracks

**Archivo:** `apps/api/src/routes/__tests__/tracks.test.ts`

```typescript
describe('POST /v1/tracks', () => {
  it('201 — crea track y retorna objeto completo', async () => {
    const res = await request
      .post('/v1/tracks')
      .set(AUTH_HEADER)
      .send({ title: 'Sandstorm', artist: 'Darude' })

    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({
      title: 'Sandstorm',
      artist: 'Darude',
    })
    expect(res.body.data.id).toBeDefined()
  })

  it('400 — falla si falta title', async () => {
    const res = await request
      .post('/v1/tracks')
      .set(AUTH_HEADER)
      .send({ artist: 'Darude' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('400 — falla si falta artist', async () => {
    const res = await request
      .post('/v1/tracks')
      .set(AUTH_HEADER)
      .send({ title: 'Sandstorm' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('401 — falla sin token', async () => {
    const res = await request
      .post('/v1/tracks')
      .send({ title: 'Sandstorm', artist: 'Darude' })

    expect(res.status).toBe(401)
  })

  it('409 — falla si el track ya existe', async () => {
    // Primer insert
    await request.post('/v1/tracks').set(AUTH_HEADER)
      .send({ title: 'Sandstorm', artist: 'Darude' })

    // Segundo insert igual
    const res = await request.post('/v1/tracks').set(AUTH_HEADER)
      .send({ title: 'Sandstorm', artist: 'Darude' })

    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('TRACK_DUPLICATE')
  })
})
```

---

### 5.2 GET /tracks (filtros)

```typescript
describe('GET /v1/tracks — filtros', () => {
  it('filtra por bpm_min y bpm_max correctamente', async () => {
    const res = await request
      .get('/v1/tracks?bpm_min=128&bpm_max=132')
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    res.body.data.forEach((track: any) => {
      expect(track.bpm).toBeGreaterThanOrEqual(128)
      expect(track.bpm).toBeLessThanOrEqual(132)
    })
  })

  it('filtra por key_camelot múltiple', async () => {
    const res = await request
      .get('/v1/tracks?key_camelot=8A&key_camelot=9A')
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    res.body.data.forEach((track: any) => {
      expect(['8A', '9A']).toContain(track.key_camelot)
    })
  })

  it('retorna paginación correcta en meta', async () => {
    const res = await request
      .get('/v1/tracks?limit=10&offset=0')
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body.meta).toMatchObject({
      limit: 10,
      offset: 0,
    })
    expect(typeof res.body.meta.total).toBe('number')
    expect(typeof res.body.meta.has_more).toBe('boolean')
  })

  it('búsqueda por texto retorna coincidencias', async () => {
    const res = await request
      .get('/v1/tracks?search=sandstorm')
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    // Al menos un resultado contiene el término
    if (res.body.data.length > 0) {
      const titles = res.body.data.map((t: any) => t.title.toLowerCase())
      expect(titles.some((t: string) => t.includes('sandstorm'))).toBe(true)
    }
  })
})
```

---

### 5.3 Import XML

```typescript
describe('POST /v1/tracks/import/xml', () => {
  it('202 — acepta XML válido y retorna job_id', async () => {
    const res = await request
      .post('/v1/tracks/import/xml')
      .set(AUTH_HEADER)
      .attach('file', Buffer.from(VALID_XML_V6), 'collection.xml')

    expect(res.status).toBe(202)
    expect(res.body.data.job_id).toBeDefined()
    expect(res.body.data.status).toBe('processing')
    expect(typeof res.body.data.total).toBe('number')
  })

  it('400 — rechaza XML que no es de Rekordbox', async () => {
    const res = await request
      .post('/v1/tracks/import/xml')
      .set(AUTH_HEADER)
      .attach('file', Buffer.from('<html></html>'), 'collection.xml')

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('XML_INVALID_FORMAT')
  })

  it('400 — rechaza si no se envía archivo', async () => {
    const res = await request
      .post('/v1/tracks/import/xml')
      .set(AUTH_HEADER)

    expect(res.status).toBe(400)
  })
})
```

---

### 5.4 Export Playlist

```typescript
describe('GET /v1/playlists/:id/export', () => {
  it('exporta XML válido para Rekordbox', async () => {
    const res = await request
      .get(`/v1/playlists/${TEST_PLAYLIST_ID}/export?format=xml`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('application/xml')
    expect(res.headers['content-disposition']).toContain('.xml')
    expect(res.text).toContain('DJ_PLAYLISTS')
    expect(res.text).toContain('TRACK')
  })

  it('exporta M3U válido para Serato', async () => {
    const res = await request
      .get(`/v1/playlists/${TEST_PLAYLIST_ID}/export?format=m3u`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('audio/x-mpegurl')
    expect(res.text).toContain('#EXTM3U')
  })

  it('400 — format inválido', async () => {
    const res = await request
      .get(`/v1/playlists/${TEST_PLAYLIST_ID}/export?format=mp3`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(400)
  })
})
```

---

## 6. E2E Tests — Flujos Críticos

**Archivo:** `apps/web/e2e/`
**Herramienta:** Playwright

### Flujo 1: Agregar un track y ver metadatos

```typescript
// e2e/add-track.spec.ts
test('DJ agrega un track y ve metadatos generados automáticamente', async ({ page }) => {
  await page.goto('/library')
  await page.click('[data-testid="add-track-button"]')

  // Llenar formulario
  await page.fill('[data-testid="artist-input"]', 'Darude')
  await page.fill('[data-testid="title-input"]', 'Sandstorm')
  await page.click('[data-testid="search-metadata-button"]')

  // Esperar enriquecimiento (máx 5s)
  await expect(page.locator('[data-testid="bpm-value"]')).toHaveText('136', { timeout: 5000 })
  await expect(page.locator('[data-testid="key-value"]')).toBeVisible()
  await expect(page.locator('[data-testid="metadata-badge"]')).toHaveText(/Spotify|IA/)

  // Guardar
  await page.click('[data-testid="save-track-button"]')

  // Aparece en la biblioteca
  await expect(page.locator('[data-testid="track-card"]').filter({ hasText: 'Sandstorm' })).toBeVisible()
})
```

---

### Flujo 2: Importar XML y ver progreso

```typescript
// e2e/import-xml.spec.ts
test('DJ importa XML de Rekordbox y ve progreso en tiempo real', async ({ page }) => {
  await page.goto('/library')
  await page.click('[data-testid="import-button"]')

  // Upload del archivo
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles('./e2e/fixtures/rekordbox_test.xml')

  // Ve barra de progreso
  await expect(page.locator('[data-testid="import-progress"]')).toBeVisible()

  // Espera que complete (máx 30s para el fixture de test)
  await expect(page.locator('[data-testid="import-status"]')).toHaveText('completed', { timeout: 30000 })

  // Ve resumen
  await expect(page.locator('[data-testid="import-summary"]')).toBeVisible()

  // Los tracks aparecen en la biblioteca
  await page.click('[data-testid="go-to-library"]')
  await expect(page.locator('[data-testid="track-card"]').first()).toBeVisible()
})
```

---

### Flujo 3: Filtrar biblioteca

```typescript
// e2e/filters.spec.ts
test('DJ filtra biblioteca por BPM y ve solo resultados dentro del rango', async ({ page }) => {
  await page.goto('/library')

  // Ajustar slider de BPM (128-132)
  await page.locator('[data-testid="bpm-min-input"]').fill('128')
  await page.locator('[data-testid="bpm-max-input"]').fill('132')

  // Esperar debounce (300ms)
  await page.waitForTimeout(400)

  // Verificar que todos los tracks visibles están en rango
  const bpmValues = await page.locator('[data-testid="track-bpm"]').allTextContents()
  bpmValues.forEach(bpm => {
    const val = parseInt(bpm)
    expect(val).toBeGreaterThanOrEqual(128)
    expect(val).toBeLessThanOrEqual(132)
  })
})
```

---

### Flujo 4: Armar playlist y exportar

```typescript
// e2e/playlist-export.spec.ts
test('DJ arma una playlist y la exporta como XML para Rekordbox', async ({ page }) => {
  await page.goto('/library')

  // Crear playlist
  await page.click('[data-testid="new-playlist-button"]')
  await page.fill('[data-testid="playlist-name-input"]', 'Set Test E2E')
  await page.click('[data-testid="create-playlist-confirm"]')

  // Agregar tracks a la playlist (drag o botón)
  await page.locator('[data-testid="track-card"]').first().hover()
  await page.locator('[data-testid="add-to-playlist-button"]').first().click()
  await page.locator('[data-testid="playlist-option"]').filter({ hasText: 'Set Test E2E' }).click()

  // Ir a la playlist y exportar
  await page.click('[data-testid="playlist-Set Test E2E"]')
  await page.click('[data-testid="export-button"]')
  await page.click('[data-testid="export-xml-option"]')

  // Verificar descarga
  const download = await page.waitForEvent('download')
  expect(download.suggestedFilename()).toMatch(/Set_Test_E2E.*\.xml/)
})
```

---

## 7. Fixtures de Test

```
apps/api/src/__tests__/fixtures/
  rekordbox_v5_100tracks.xml    ← para tests de parseo
  rekordbox_v6_100tracks.xml    ← para tests de parseo
  rekordbox_empty.xml           ← edge case: colección vacía
  rekordbox_malformed.xml       ← edge case: XML inválido

apps/web/e2e/fixtures/
  rekordbox_test.xml            ← 10 tracks para E2E rápido
```

---

## 8. Scripts

```json
// package.json (root)
{
  "scripts": {
    "test": "turbo run test",
    "test:unit": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## 9. CI — GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npm run test:unit        # rápido, siempre
      - run: npm run test:integration # rápido, siempre
      # E2E solo en PR a main (son lentos)
      - if: github.base_ref == 'main'
        run: npm run test:e2e
```

---

## 10. Criterios de Gate 2

El Gate 2 se considera aprobado cuando:

- [ ] Technical Spec revisado y sin inconsistencias con API Spec
- [ ] API Spec cubre todos los endpoints del MVP
- [ ] Test Spec define casos para los 5 flujos críticos
- [ ] Fixtures de test existen o están planificados
- [ ] CI configurado y pasando en rama inicial
- [ ] Checklist pre-desarrollo del Technical Spec completo

---

*Test Spec — documento vivo. Agregar casos cuando aparezcan bugs en producción.*