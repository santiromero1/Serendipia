# Serendipia 🎧

> *"No sabés lo que vas a encontrar. Eso es lo mejor."*

**Serendipia** es un segundo cerebro para DJs. Una plataforma que combina análisis automático de metadatos musicales, visualización en red de tu biblioteca e inteligencia artificial conversacional — para que cualquier DJ pueda preparar sets, redescubrir su música y tomar decisiones creativas en tiempo real.

---

## El problema que resuelve

Un DJ con 10.000 tracks no puede navegar su biblioteca en el momento. Las herramientas actuales son técnicas, no creativas. Ninguna entiende *"quiero explotar la pista, estoy en 132 BPM"* y te responde con tracks de tu propia biblioteca.

Serendipia lo hace.

---

## Los tres pilares

**🧠 Cerebro** — Ingresás el nombre de una canción. La IA genera BPM, clave, energía, género y etiquetas de momento de DJ (`#peak`, `#explotarla`, `#cierre`) automáticamente. Sin necesitar el archivo de audio.

**🕸️ Red** — Tu biblioteca visualizada como un grafo de nodos. Los tracks se conectan por compatibilidad armónica, BPM y energía. Descubrís relaciones que nunca hubieras visto en una lista.

**💬 Conversación** — Chat en lenguaje natural con tu biblioteca. Le preguntás, ella responde con tus propios tracks.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React + Tailwind CSS |
| Backend | Node.js + Express |
| Base de datos | Supabase (PostgreSQL) |
| Música API | Spotify Web API |
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
├── CKM/                    ← Collective Knowledge Management
│   ├── README.md           ← Índice y guía de uso
│   ├── DISCOVERY.md        ← Visión, problema, usuario, mercado
│   ├── PRD.md              ← Requerimientos y specs técnicos
│   ├── DESIGN.md           ← (próximo) Flujos y sistema de diseño
│   ├── TECHNICAL.md        ← (próximo) Arquitectura y decisiones
│   ├── API.md              ← (próximo) Contratos de API
│   └── TEST.md             ← (próximo) Casos de prueba
├── apps/
│   ├── web/                ← Frontend React
│   └── api/                ← Backend Node.js
├── packages/
│   └── shared/             ← Tipos y utilidades compartidas
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

| Fase | Estado |
|------|--------|
| Discovery | ✅ Completo |
| PRD | ✅ Completo |
| Design | 🔲 Pendiente |
| `GATE 1` | 🔲 Pendiente |
| Technical Spec | 🔲 Pendiente |
| API Spec | 🔲 Pendiente |
| Test Spec | 🔲 Pendiente |
| `GATE 2` | 🔲 Pendiente |
| Implementation | 🔲 Pendiente |
| Validation | 🔲 Pendiente |
| Release | 🔲 Pendiente |

---

## Contexto para Claude Code

Si estás usando este repo con Claude Code o Cursor, empezá siempre con:

```
Leé los archivos en /CKM antes de responder cualquier pregunta sobre este proyecto.
DISCOVERY.md tiene la visión y estrategia. PRD.md tiene los specs técnicos completos.
Este proyecto sigue Spec Driven Design: nada se implementa sin spec aprobado en /CKM.
```

---

*Serendipia · Tu DJ Second Brain*
