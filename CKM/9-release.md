# Serendipia — Release Spec
> Versión 1.0 · Mayo 2026
> Estado: Draft

---

## 1. Filosofía de Release

**Ship pequeño, ship seguido.** Un release pequeño es un release que se puede revertir en 5 minutos. Un release grande es un riesgo acumulado.

Preferir releases frecuentes de features individuales sobre releases grandes con todo junto. Si algo sale mal, el blast radius es menor.

---

## 2. Entornos

| Entorno | URL | Cuándo se deploya |
|---------|-----|------------------|
| **Local** | localhost:5173 / :3001 | Siempre en desarrollo |
| **Staging** | staging.serendipia.app | En cada merge a `dev` (automático) |
| **Production** | serendipia.app | En cada merge a `main` (manual con aprobación) |

Staging usa su propia instancia de Supabase (datos de prueba, no reales). Production usa la instancia principal.

---

## 3. Pipeline de Deploy

```
Push a feat/* o fix/*
        ↓
GitHub Actions: lint + typecheck + unit tests
        ↓  (si pasa)
PR a dev
        ↓  (merge)
Deploy automático a Staging (Vercel + Railway)
        ↓
Smoke tests en staging (manual, 5 min)
        ↓  (si pasa)
PR a main
        ↓  (merge manual, aprobación consciente)
Deploy automático a Production
        ↓
Smoke tests en producción (manual, 5 min)
        ↓
Entrada en CHANGELOG
```

---

## 4. GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: ['**']
  pull_request:
    branches: [dev, main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - run: npm ci

      - name: Typecheck
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: Unit Tests
        run: npm run test:unit

      - name: Integration Tests
        run: npm run test:integration
        env:
          SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.TEST_SUPABASE_SERVICE_KEY }}
          SPOTIFY_CLIENT_ID: ${{ secrets.SPOTIFY_CLIENT_ID }}
          SPOTIFY_CLIENT_SECRET: ${{ secrets.SPOTIFY_CLIENT_SECRET }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

      # E2E solo en PRs a main (lentos)
      - name: E2E Tests
        if: github.base_ref == 'main'
        run: npm run test:e2e
        env:
          PLAYWRIGHT_BASE_URL: ${{ secrets.STAGING_URL }}
```

---

## 5. Versioning

Serendipia usa **Semantic Versioning** simplificado:

```
MAJOR.MINOR.PATCH

MAJOR  → cambio que rompe compatibilidad (raro en esta etapa)
MINOR  → feature nueva, visible para el usuario
PATCH  → bugfix, mejora interna, cambio de copy
```

Versión inicial de MVP: `0.1.0`

El número de versión vive en:
- `package.json` (root)
- Header de la app (visible al usuario en Settings)
- Cada entrada del CHANGELOG

---

## 6. CHANGELOG

Cada release tiene una entrada en `CHANGELOG.md` (en la raíz del repo).

**Formato:**
```markdown
## [0.2.0] — 2026-06-15

### Nuevas funcionalidades
- Importación de biblioteca desde Rekordbox XML
- Barra de progreso en tiempo real durante la importación
- Soporte para XML de Rekordbox v5 y v6

### Mejoras
- Los filtros ahora se reflejan en la URL (compartibles)
- El panel de agregar track muestra preview de metadatos antes de guardar

### Fixes
- Corregido: la clave Bbm se convertía incorrectamente a Camelot
- Corregido: los tracks con BPM decimal en Rekordbox no se importaban

---

## [0.1.0] — 2026-06-01

### Nuevas funcionalidades
- Registro y login con email
- Agregar tracks individuales con enriquecimiento automático (Spotify identidad + GetSongBPM BPM/clave)
- Fallback a Claude API para tracks underground no encontrados en las APIs
- Generación de DJ tags (peak, explotarla, calentar, etc.)
- Biblioteca visual con grid y lista
- Edición manual de metadatos
```

---

## 7. Checklist de Release

### Pre-release (staging)
```
[ ] CI passing en rama main
[ ] Smoke tests en staging — PASS
[ ] Functional QA completado (ver VALIDATION.md Nivel 2)
[ ] 0 bugs P0 o P1 abiertos
[ ] CHANGELOG actualizado con la versión nueva
[ ] Versión bumpeada en package.json
[ ] Variables de entorno de producción actualizadas si hay nuevas
```

### Deploy a producción
```
[ ] Merge PR a main (consciente, no automático)
[ ] Verificar que Vercel y Railway deployaron correctamente
[ ] Smoke tests en producción — PASS (5 minutos)
[ ] Si algo falla → rollback inmediato (ver sección 8)
```

### Post-release
```
[ ] Tag de Git creado: git tag v0.2.0 && git push --tags
[ ] Comunicación a beta users si corresponde (email o Discord)
[ ] Monitorear logs en Railway las primeras 2 horas
[ ] Anotar cualquier comportamiento inesperado
```

---

## 8. Rollback

Si algo sale mal en producción:

### Frontend (Vercel)
```bash
# En el dashboard de Vercel → Deployments → click en deploy anterior → Promote to Production
# O via CLI:
vercel rollback [deployment-url]
```

### Backend (Railway)
```bash
# En el dashboard de Railway → Deployments → click en deploy anterior → Redeploy
```

### Base de datos (Supabase)
```bash
# Si hay una migración de DB en el release:
# Tener el SQL de rollback preparado ANTES de deployar

# Ejemplo de rollback de migración:
-- rollback_005.sql
DROP TABLE IF EXISTS import_jobs;
```

**Regla:** Si el release incluye una migración de base de datos que no es backward-compatible, el rollback de código **no es suficiente**. Planificar el rollback de DB antes de deployar, o hacer la migración en dos fases (backward-compatible primero).

---

## 9. Monitoring

Para MVP, monitoring es simple:

| Qué | Herramienta | Cómo acceder |
|-----|------------|--------------|
| Logs del backend | Railway dashboard | railway.app → proyecto → logs |
| Errores del frontend | Consola de Vercel | vercel.com → proyecto → functions |
| Estado de la DB | Supabase dashboard | supabase.com → proyecto → logs |
| Uptime | UptimeRobot (free) | Alerta por email si la API cae |

**Qué monitorear activamente las primeras 2h post-release:**
- Tasa de errores 500 en los logs de Railway
- Latencia de POST /tracks (el endpoint más crítico)
- Cualquier error de "rate limit" de Spotify o Claude

---

## 10. Plan de Releases — Fase 1

| Release | Versión | Contenido | Target |
|---------|---------|-----------|--------|
| Alpha privado | 0.1.0 | Auth + agregar tracks + metadatos automáticos | Semana 4 |
| Alpha privado | 0.2.0 | Filtros + importación XML + playlists + export | Semana 6 |
| Beta cerrado | 0.3.0 | Polish, bugs del alpha, mejoras de UX | Semana 8 |
| Beta público | 0.4.0 | Estabilidad + performance + feedback integrado | Semana 10 |
| Release público | 1.0.0 | Producto completo Fase 1, sin bugs P0/P1 | Semana 12 |

---

## 11. Comunicación de Releases

### Para alpha/beta (usuarios invitados)
- Email directo con qué hay nuevo y qué probar
- Pedir feedback específico sobre las features del release
- Canal de Discord o grupo de WhatsApp para feedback rápido

### Para release público
- Post en redes sociales orientado a DJs
- Product Hunt si el momento lo justifica
- Demo video (screen recording de los flujos principales)

---

*Release Spec — actualizar con cada release completado. El historial de releases vive en CHANGELOG.md.*