# Serendipia 🎧

> *"No sabés lo que vas a encontrar. Eso es lo mejor."*

**Serendipia** es un segundo cerebro para DJs. Una plataforma que combina análisis automático de metadatos musicales, visualización en red de tu biblioteca e inteligencia artificial conversacional — para que cualquier DJ pueda preparar sets, redescubrir su música y tomar decisiones creativas en tiempo real.

---

## El problema que resuelve

Un DJ con 10.000 tracks no puede navegar su biblioteca en el momento. Las herramientas actuales son técnicas, no creativas. Ninguna entiende *"quiero explotar la pista, estoy en 132 BPM"* y te responde con tracks de tu propia biblioteca.

Serendipia lo hace.

---

## Los tres pilares

**🧠 Cerebro** — Ingresás el nombre de una canción. El sistema genera BPM, clave, energía, género y etiquetas de momento de DJ (`#peak`, `#explotarla`, `#cierre`) automáticamente, combinando Spotify, GetSongBPM y Claude. Sin necesitar el archivo de audio.

**🕸️ Red** — Tu biblioteca visualizada como un grafo de nodos. Los tracks se conectan por compatibilidad armónica, BPM y energía. Descubrís relaciones que nunca hubieras visto en una lista.

**💬 Conversación** — Chat en lenguaje natural con tu biblioteca. Le preguntás, ella responde con tus propios tracks.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React + Tailwind CSS |
| Backend | Node.js + Express |
| Base de datos | Supabase (PostgreSQL) |
| Música API (identidad) | Spotify Web API |
| Datos DJ (BPM/clave) | GetSongBPM API |
| IA | Claude API (Anthropic) |
| Grafo | D3.js |
| Hosting | Vercel + Railway |

---

## Metodología — Spec Driven Design

Este proyecto se desarrolla siguiendo **Spec Driven Design**: cada funcionalidad nace de un spec escrito y aprobado antes de escribir una línea de código. Los specs viven en `/CKM`.

El flujo tiene dos gates de validación obligatorios:

```
Discovery  →  PRD         →  Design
──────── GATE 1: alineación de stakeholders ────────
Technical  →  API         →  Test
──────── GATE 2: tech review y sign-off ────────
Impl       →  Validation  →  Release
```

### Las fases explicadas

| Fase | Qué produce | Quién lidera |
|------|-------------|-------------|
| **Discovery** | Problema, usuario, mercado, oportunidad | Product |
| **PRD** | Requerimientos funcionales, modelo de datos, criterios de aceptación | Product + Tech |
| **Design** | Wireframes, flujos de usuario, sistema de diseño | Design |
| `GATE 1` | Sign-off de stakeholders antes de tocar código | Todos |
| **Technical Spec** | Arquitectura, decisiones técnicas, riesgos | Tech Lead |
| **API Spec** | Endpoints, contratos, tipos, errores | Backend |
| **Test Spec** | Casos de prueba, escenarios edge, criterios de calidad | QA + Dev |
| `GATE 2` | Tech review y aprobación antes de implementar | Tech |
| **Implementation** | Código | Dev |
| **Validation** | QA, UAT, performance | QA + Product |
| **Release** | Deploy, monitoring, comunicación | Tech + Product |

### Reglas del proceso

- **Nada se implementa sin spec aprobado.** Si no está en `/CKM`, no existe.
- **Los gates son bloqueantes.** Sin sign-off no se avanza a la siguiente etapa.
- **Los specs son documentos vivos.** Se actualizan cuando cambia la realidad, no cuando conviene.
- **El código sigue al spec, no al revés.** Si el código diverge del spec, se actualiza el spec primero.

---

## Estructura del repositorio

```
serendipia/
├── README.md               ← Este archivo
├── CKM/                    ← Collective Knowledge Management (specs)
│   ├── README.md           ← Índice y guía de uso
│   ├── 1-discovery.md      ← Visión, problema, usuario, mercado
│   ├── 2-prd.md            ← Requerimientos y modelo de datos
│   ├── 3-design.md         ← Flujos y sistema de diseño
│   ├── 4-technical.md      ← Arquitectura y decisiones técnicas
│   ├── 5-api.md            ← Contratos de API
│   ├── 6-test.md           ← Casos de prueba
│   ├── 7-impl.md           ← Plan de implementación
│   ├── 8-validation.md     ← QA y validación
│   └── 9-release.md        ← Deploy, versioning, rollback
├── apps/
│   ├── web/                ← Frontend React
│   └── api/                ← Backend Node.js
├── packages/
│   └── types/              ← @serendipia/types (tipos compartidos)
└── docs/                   ← Documentación técnica adicional
```

---

## Cómo empezar

```bash
# Clonar el repo
git clone https://github.com/tu-usuario/serendipia.git
cd serendipia

# Instalar dependencias
npm install

# Variables de entorno
cp .env.example .env
# Completar: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY

# Desarrollo
npm run dev
```

---

## Estado actual del proyecto

| Fase | Spec | Ejecución |
|------|------|-----------|
| Discovery | ✅ Completo | — |
| PRD | ✅ Completo | — |
| Design | ✅ Completo | — |
| `GATE 1` | — | 🔲 Sign-off pendiente |
| Technical Spec | ✅ Completo | — |
| API Spec | ✅ Completo | — |
| Test Spec | ✅ Completo | — |
| `GATE 2` | — | 🔲 Sign-off pendiente |
| Implementation | ✅ Spec listo | 🔲 No iniciada |
| Validation | ✅ Spec listo | 🔲 No iniciada |
| Release | ✅ Spec listo | 🔲 No iniciada |

> Los 9 specs están escritos y reconciliados entre sí. Próximo paso: firmar Gate 1 y Gate 2, luego arrancar el Sprint 1 de [7-impl.md](7-impl.md).

---

## Contexto para Claude Code

Si estás usando este repo con Claude Code o Cursor, empezá siempre con:

```
Leé los archivos en /CKM (1-discovery.md … 9-release.md) antes de responder cualquier pregunta sobre este proyecto.
1-discovery.md tiene la visión y estrategia; 2-prd.md los requerimientos; 4-technical.md / 5-api.md los specs técnicos.
Este proyecto sigue Spec Driven Design: nada se implementa sin spec aprobado en /CKM.
```

---

*Serendipia · Tu DJ Second Brain*
