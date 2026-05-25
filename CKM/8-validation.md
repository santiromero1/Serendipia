# Serendipia — Validation Spec
> Versión 1.0 · Mayo 2026
> Estado: Draft
> Contexto: Desarrollador único — validación pragmática, no burocrática

---

## 1. Qué es Validación en este contexto

Validation es la fase entre "el código está terminado" y "está en producción con usuarios reales". Su objetivo es atrapar lo que los tests automáticos no pueden: bugs de UX, flujos rotos con datos reales, performance bajo carga real, y que la experiencia sea la que prometimos en el Design Spec.

Para un solo dev, validation no es un departamento. Es una checklist estructurada que se ejecuta antes de cada release.

---

## 2. Niveles de Validación

```
Nivel 1 — Smoke Tests        → ¿Arranca y no explota?
Nivel 2 — Functional QA      → ¿Hace lo que prometimos?
Nivel 3 — UX Validation      → ¿Se siente bien?
Nivel 4 — Performance        → ¿Aguanta datos reales?
Nivel 5 — Beta User Testing  → ¿Los DJs reales lo entienden?
```

MVP requiere Niveles 1–3 obligatoriamente. Niveles 4–5 antes del release público.

---

## 3. Nivel 1 — Smoke Tests

Ejecutar después de cada deploy. Duración: ~5 minutos.

```
Entorno: producción (no local, no staging)
Herramienta: manual + cURL

[ ] El frontend carga sin errores de consola críticos
[ ] La página de login/registro es accesible
[ ] POST /v1/tracks responde 201 con { data: { id, title, artist } }
[ ] GET /v1/tracks responde 200 con { data: [], meta: {} }
[ ] GET /v1/auth/me responde 200 con el user_id correcto
[ ] Variables de entorno: el servidor arrancó (si no, no llegás hasta acá)
```

Si alguno falla → rollback inmediato, no investigar en producción.

---

## 4. Nivel 2 — Functional QA

Ejecutar antes de cada release. Duración: ~45 minutos.
Usar datos reales (tracks reales, XML real de Rekordbox).

### 4.1 Agregar Track Individual

```
Setup: usuario autenticado, biblioteca vacía o con tracks existentes

[ ] Abrir panel "Agregar Track"
[ ] Ingresar artista y título de un track conocido (ej: Darude - Sandstorm)
[ ] Click "Buscar metadatos"
[ ] Verificar: BPM se completa automáticamente y es correcto (vía GetSongBPM)
[ ] Verificar: Clave Camelot se muestra (ej: 3A para Sandstorm)
[ ] Verificar: Barra de energía refleja un valor entre 0 y 1
[ ] Verificar: Badge muestra la fuente ("✓ Spotify", "✓ BPM" o "~ IA")
[ ] Verificar: Al menos 1 DJ tag fue generado (ej: [peak])
[ ] Click "Guardar"
[ ] Verificar: El track aparece en la biblioteca sin recargar la página
[ ] Verificar: Intentar agregar el mismo track → aparece mensaje de duplicado (409)
```

```
Track underground (probablemente no en Spotify):
[ ] Ingresar artista y título de un edit o bootleg conocido
[ ] Verificar: el sistema no explota si Spotify no lo encuentra
[ ] Verificar: Badge muestra "~ IA" con metadatos inferidos
[ ] Verificar: Los metadatos inferidos son razonables (no BPM=0, no null en todo)
```

---

### 4.2 Importación desde Rekordbox XML

```
Setup: archivo XML de Rekordbox real (tu biblioteca personal, o subset de 50+ tracks)

[ ] Click "Importar desde Rekordbox"
[ ] Arrastrar archivo XML al área de drop
[ ] Verificar: aparece barra de progreso con número de tracks detectados
[ ] Verificar: el progreso avanza (polling funciona)
[ ] Verificar: el proceso completa sin error
[ ] Verificar: resumen muestra conteo correcto (enriquecidos / IA / fallidos)
[ ] Verificar: los tracks aparecen en la biblioteca
[ ] Verificar: los tracks con BPM en Rekordbox conservan ese dato como base
[ ] Verificar: intentar importar el mismo XML de nuevo → no crea duplicados
[ ] Verificar: importar XML de Rekordbox v5 Y v6 (si tenés ambos)
```

---

### 4.3 Filtros de Biblioteca

```
Setup: biblioteca con 50+ tracks de géneros y BPMs variados

[ ] Filtrar por BPM 128-132 → todos los resultados tienen BPM en ese rango
[ ] Filtrar por clave 8A → todos los resultados tienen clave 8A
[ ] Filtrar por clave 8A + 9A → resultados tienen alguna de las dos
[ ] Filtrar por energía 0.8-1.0 → tracks de alta energía
[ ] Filtrar por tag "peak" → solo tracks con ese tag
[ ] Combinar BPM + clave + tag → resultados satisfacen todos los filtros
[ ] Buscar por texto "sand" → aparece Sandstorm y otros que contengan "sand"
[ ] Limpiar filtros → vuelven todos los tracks
[ ] Ordenar por BPM ascendente → orden correcto
[ ] Ordenar por energía descendente → orden correcto
[ ] La URL refleja los filtros activos (compartible)
[ ] Abrir esa URL en nueva pestaña → filtros se restauran
```

---

### 4.4 Playlists

```
[ ] Crear playlist con nombre "Set Test QA"
[ ] Agregar 3 tracks a la playlist
[ ] Verificar: track_count se actualiza a 3
[ ] Reordenar los tracks → el orden persiste al recargar
[ ] Quitar un track → track_count baja a 2
[ ] Exportar como XML → archivo se descarga
[ ] Exportar como M3U → archivo se descarga
[ ] Abrir el XML exportado en Rekordbox → los tracks aparecen en la playlist
[ ] Renombrar playlist → el nuevo nombre se muestra
[ ] Eliminar playlist → desaparece del sidebar
```

---

### 4.5 Edición Manual de Metadatos

```
[ ] Abrir un track → click en editar
[ ] Cambiar BPM → se guarda y se muestra actualizado
[ ] Cambiar clave → se guarda
[ ] Agregar tag custom → aparece en el track
[ ] Eliminar un tag → desaparece
[ ] Agregar nota personal → se guarda
[ ] Badge cambia a "✎ Manual" cuando se edita un campo
```

---

## 5. Nivel 3 — UX Validation

Duración: ~30 minutos. Hacerlo con ojos frescos (después de un break, o al día siguiente).

### 5.1 First-Time User Experience

```
Simular ser un DJ que entra por primera vez:

[ ] El estado vacío explica claramente qué hacer
[ ] Los dos CTAs (Importar / Agregar Track) son obvios
[ ] El flujo de onboarding no requiere leer documentación
[ ] El tiempo hasta "primer valor" (ver un track con metadatos) < 2 minutos
```

### 5.2 Velocidad percibida

```
[ ] Agregar un track: la UI responde inmediatamente (optimistic update)
[ ] Los filtros se aplican en < 400ms (incluido debounce)
[ ] La biblioteca con 500+ tracks no se siente lenta al scrollear
[ ] Los paneles laterales se abren con animación fluida (no saltan)
[ ] No hay spinners infinitos — siempre hay feedback de estado
```

### 5.3 Manejo de errores visible

```
[ ] Spotify no disponible → mensaje claro, no pantalla en blanco
[ ] Archivo XML inválido → mensaje claro de qué salió mal
[ ] Sesión expirada → redirige a login, no muestra error técnico
[ ] Sin conexión → la app falla con gracia (no explota)
```

### 5.4 Design Spec compliance

Verificar contra 3-design.md:

```
[ ] La paleta de colores es la definida (fondo #0A0A0F, primary #7C3AED)
[ ] Los badges de estado usan los colores correctos (verde/ámbar/azul/gris)
[ ] La tipografía de BPM y clave usa font-mono
[ ] El dot de energía en cada track usa la escala de colores de energía
[ ] Los shortcuts de teclado funcionan (⌘K, ⌘N, ⌘I, Esc)
[ ] La vista lista muestra las columnas correctas
[ ] El layout a 1280px es el descrito en el spec
```

---

## 6. Nivel 4 — Performance

Ejecutar una vez antes del release público.

### 6.1 Biblioteca grande

```
Setup: importar 1000+ tracks (usar tu biblioteca real o generar datos de prueba)

[ ] La biblioteca carga en < 3 segundos
[ ] El scroll de 1000 tracks no baja de 60fps (virtualización funciona)
[ ] Los filtros responden en < 400ms con 1000 tracks
[ ] La importación de 1000 tracks completa en < 10 minutos
```

### 6.2 API bajo carga básica

```
Herramienta: wrk o autocannon (CLI, 2 minutos)

# GET /tracks con 10 usuarios concurrentes durante 30 segundos
autocannon -c 10 -d 30 https://api.serendipia.app/v1/tracks \
  -H "Authorization: Bearer $TOKEN"

Criterios mínimos:
[ ] Latencia p99 < 500ms
[ ] 0% error rate
[ ] Throughput > 50 req/s
```

---

## 7. Nivel 5 — Beta User Testing

Ejecutar con 3–5 DJs reales antes del release público.

### 7.1 Setup de la sesión

- Duración: 30–45 minutos por DJ
- Formato: el DJ comparte pantalla, vos observás sin intervenir
- Objetivo: identificar confusión, fricción y lo que realmente usan

### 7.2 Tareas a pedirles (sin instrucciones de cómo)

```
1. "Agregá 3 tracks que uses frecuentemente en tus sets"
2. "Encontrá todos los tracks de tu biblioteca que mezclarían bien con [track X]"
3. "Armá una playlist para el peak de esta noche"
4. "Exportá esa playlist para usarla en Rekordbox"
```

### 7.3 Qué observar

```
[ ] ¿Dónde se detienen y no saben qué hacer?
[ ] ¿Qué buscan que no encuentran?
[ ] ¿Qué ignoran completamente?
[ ] ¿Qué comentan espontáneamente (positivo o negativo)?
[ ] ¿El tiempo de enriquecimiento les parece aceptable?
[ ] ¿Confían en los metadatos generados por la IA?
[ ] ¿Los DJ tags les resultan útiles o irrelevantes?
```

### 7.4 Métricas de éxito del beta

```
[ ] 3/5 DJs completan las 4 tareas sin ayuda
[ ] NPS promedio > 40
[ ] Tiempo promedio hasta "primer valor" < 3 minutos
[ ] Al menos 2 DJs expresan que lo usarían en su workflow real
```

---

## 8. Bugs — Clasificación y SLA

| Severidad | Definición | SLA |
|-----------|-----------|-----|
| **P0 — Crítico** | Data loss, auth bypass, biblioteca del usuario inaccesible | Fix en < 4h, hotfix a producción |
| **P1 — Alto** | Feature core rota (import, export, filtros) | Fix en < 24h |
| **P2 — Medio** | Feature secundaria rota, workaround posible | Fix en próximo sprint |
| **P3 — Bajo** | Visual, UX menor, typo | Fix cuando haya tiempo |

---

## 9. Criterios de Release

Un release está listo para producción cuando:

```
[ ] Nivel 1 (Smoke Tests) — PASS en staging
[ ] Nivel 2 (Functional QA) — 0 bugs P0 o P1 abiertos
[ ] Nivel 3 (UX Validation) — aprobado subjetivamente
[ ] Tests automáticos — CI passing en rama main
[ ] RELEASE.md — entrada nueva con changelog
[ ] Rollback plan — saber exactamente cómo volver a la versión anterior
```

Para el **release público** (post-beta), además:

```
[ ] Nivel 4 (Performance) — criterios de latencia cumplidos
[ ] Nivel 5 (Beta Testing) — métricas de éxito alcanzadas
[ ] Términos de servicio y política de privacidad publicados
[ ] Soporte: canal de feedback habilitado (email o Discord)
```

---

*Validation Spec — agregar casos de regresión cuando aparezcan bugs en producción.*