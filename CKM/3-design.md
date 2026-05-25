# Serendipia — Design Spec
> Versión 1.0 · Mayo 2026  
> Estado: Draft  
> Referencia visual: Raycast / Vercel (dark mode premium)

---

## 1. Principios de Diseño

**1. Oscuro por defecto.** El DJ trabaja en entornos de poca luz. La UI no puede competir con la pista.

**2. La música es protagonista.** La interfaz desaparece. Lo que importa son los tracks, las conexiones, el set.

**3. Densidad con claridad.** Mucha información en pantalla, pero jerarquizada. Nunca caótico.

**4. Rápido o no sirve.** Cada acción frecuente debe ejecutarse en ≤ 2 clics o 1 shortcut de teclado.

**5. Descubrimiento sobre búsqueda.** La UI incentiva explorar, no solo encontrar lo que ya sabés que buscás.

---

## 2. Sistema de Diseño

### 2.1 Paleta de Colores

```
── Fondos ──────────────────────────────────────
background:       #0A0A0F   (negro profundo, base)
surface:          #13131A   (cards, paneles)
surface-raised:   #1A1A24   (hover states, inputs)
border:           #1E1E2E   (separadores sutiles)

── Accentos ────────────────────────────────────
primary:          #7C3AED   (púrpura — acción principal)
primary-light:    #A78BFA   (púrpura claro — labels, highlights)
primary-glow:     #7C3AED33 (púrpura con transparencia — halos)
cyan:             #06B6D4   (acento secundario — compatibilidad, conexiones)
amber:            #F59E0B   (warnings, Fase 2 en roadmap)
green:            #10B981   (éxito, metadatos enriquecidos)

── Texto ───────────────────────────────────────
text-primary:     #F8F8FF   (títulos, labels importantes)
text-secondary:   #94A3B8   (cuerpo, descripciones)
text-muted:       #475569   (placeholders, metadata secundaria)

── Semánticos ──────────────────────────────────
error:            #F87171
warning:          #FBBF24
success:          #34D399
info:             #38BDF8

── Energía (para nodos del grafo y barras) ─────
energy-low:       #3B82F6   (azul frío — 0.0 a 0.35)
energy-mid:       #A78BFA   (púrpura — 0.35 a 0.65)
energy-high:      #F59E0B   (ámbar — 0.65 a 0.85)
energy-peak:      #EF4444   (rojo — 0.85 a 1.0)
```

### 2.2 Tipografía

```
font-display:  "Inter", sans-serif
font-mono:     "JetBrains Mono", monospace   (BPM, clave, valores numéricos)

── Escala ──────────────────────────────────────
text-xs:    11px / line-height: 16px
text-sm:    13px / line-height: 18px
text-base:  15px / line-height: 22px
text-lg:    18px / line-height: 26px
text-xl:    22px / line-height: 30px
text-2xl:   28px / line-height: 36px
text-3xl:   36px / line-height: 44px

── Pesos ───────────────────────────────────────
regular:  400
medium:   500
semibold: 600
bold:     700
```

### 2.3 Espaciado

Sistema de 4px base:
```
space-1:   4px
space-2:   8px
space-3:   12px
space-4:   16px
space-5:   20px
space-6:   24px
space-8:   32px
space-10:  40px
space-12:  48px
space-16:  64px
```

### 2.4 Radios y Sombras

```
radius-sm:   4px   (badges, chips pequeños)
radius-md:   8px   (cards, inputs)
radius-lg:   12px  (paneles, modals)
radius-xl:   16px  (elementos prominentes)
radius-full: 9999px (pills, avatares)

shadow-glow-purple: 0 0 20px #7C3AED33
shadow-glow-cyan:   0 0 20px #06B6D433
shadow-card:        0 4px 24px rgba(0,0,0,0.4)
```

### 2.5 Componentes Base

#### Track Card
```
┌─────────────────────────────────────────┐
│ ● Título del Track              [··· ]  │  ← dot = color de energía
│   Artista                               │
│                                         │
│  138  ·  8A  ·  ████████░░  0.82        │  ← mono font
│                                         │
│  [techno] [peak] [explotarla]           │  ← chips
└─────────────────────────────────────────┘
```
- Fondo: `surface`
- Border: `border` (1px)
- Hover: border cambia a `primary`, leve `shadow-glow-purple`
- El dot de energía usa la escala de colores de energía

#### Chip / Tag
```
[explotarla]  → background: primary/15%, text: primary-light, border: primary/30%
[techno]      → background: surface-raised, text: text-secondary, border: border
[✓ enriquecido] → background: green/15%, text: green
[~ IA]          → background: amber/15%, text: amber
```

#### Input de búsqueda
```
┌─ 🔍 Buscar tracks... ──────── ⌘K ─┐
└───────────────────────────────────┘
```
- Fondo: `surface-raised`
- Focus: border `primary`, glow sutil
- `⌘K` abre búsqueda global desde cualquier lugar

#### Botón primario
```
[ + Agregar Track ]
```
- Background: `primary`
- Hover: `primary` + 10% lightness
- Active: scale 0.97

---

## 3. Layout General

### 3.1 Estructura de la App

```
┌────────────────────────────────────────────────────────────┐
│  TOPBAR (56px)                                             │
│  [≡ Serendipia]  [Biblioteca] [Grafo]    [⌘K] [+ Track]  │
├───────────┬────────────────────────────────────────────────┤
│           │                                                │
│  SIDEBAR  │              MAIN CONTENT                      │
│  (240px)  │                                                │
│           │                                                │
│  Filtros  │    Vista activa:                               │
│           │    · Biblioteca (grid/lista)                   │
│  ──────   │    · Grafo                                     │
│           │    · Playlist activa                           │
│  Playlists│                                                │
│           │                                                │
│  ──────   │                                                │
│           │                                     [ Chat ▲ ] │
│  Tags     │                                                │
│           │                                                │
└───────────┴────────────────────────────────────────────────┘
```

- **Topbar**: fijo, altura 56px, `background` con border-bottom `border`
- **Sidebar**: fijo, 240px, colapsable a 48px (solo iconos)
- **Main content**: scroll vertical, ocupa el resto
- **Chat trigger**: botón flotante bottom-right que abre panel

### 3.2 Panel de Chat (estado abierto)

```
┌────────────────────────────────────────────────────────────┐
│  TOPBAR                                                    │
├───────────┬──────────────────────────┬─────────────────────┤
│           │                          │                     │
│  SIDEBAR  │    MAIN CONTENT          │   CHAT PANEL        │
│           │    (se comprime)         │   (380px)           │
│           │                          │                     │
│           │                          │  ┌─ Serendipia AI ─┐│
│           │                          │  │                 ││
│           │                          │  │  [mensajes]     ││
│           │                          │  │                 ││
│           │                          │  │                 ││
│           │                          │  └─────────────────┘│
│           │                          │  [ escribí acá... ] │
└───────────┴──────────────────────────┴─────────────────────┘
```

- Ancho: 380px, slide-in desde la derecha (animación: 200ms ease-out)
- El main content se comprime con transición suave
- El panel tiene su propio scroll de mensajes
- Track cards en el chat son versiones compactas (sin chips, solo título + BPM + clave)

---

## 4. Pantallas

### 4.1 Biblioteca — Vista Grid

**Estado vacío (primer uso):**
```
        [ícono de vinilo o nodo]
        
        Tu biblioteca está vacía
        Importá tu biblioteca de Rekordbox o
        agregá tu primer track para empezar.
        
        [ Importar desde Rekordbox ]   [ + Agregar Track ]
```

**Estado con tracks:**
```
┌─ SIDEBAR ──────────┐┌─ MAIN ─────────────────────────────────────┐
│                    ││  [ 🔍 Buscar tracks...          ⌘K ]        │
│  Filtros           ││                                              │
│                    ││  Grid  ≡ Lista    1.247 tracks   ↕ BPM ▾   │
│  BPM               ││  ─────────────────────────────────────────  │
│  [====|====] 128   ││                                              │
│  120       140     ││  ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│                    ││  │ Track    │ │ Track    │ │ Track    │   │
│  Clave (Camelot)   ││  │ Card     │ │ Card     │ │ Card     │   │
│  [8A][9A][10A]     ││  └──────────┘ └──────────┘ └──────────┘   │
│  [8B][9B]...       ││                                              │
│                    ││  ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  Energía           ││  │ Track    │ │ Track    │ │ Track    │   │
│  [====|====] 0.7   ││  │ Card     │ │ Card     │ │ Track    │   │
│                    ││  └──────────┘ └──────────┘ └──────────┘   │
│  Momento           ││                                              │
│  [peak] [calentar] ││                                              │
│  [cierre] [after]  ││                                              │
│                    ││                                              │
│  ──────────────    ││                                              │
│                    ││                                              │
│  Playlists         ││                                              │
│  + Set Viernes     ││                                              │
│  + Warm Up Julio   ││                                              │
└────────────────────┘└────────────────────────────────────────────┘
```

### 4.2 Biblioteca — Vista Lista

Columnas visibles:
```
│ ● │ Título + Artista          │ BPM │ Clave │ Energía │ Género    │ Tags       │ ··· │
│───│───────────────────────────│─────│───────│─────────│───────────│────────────│─────│
│ ● │ Kernkraft 400 · Z. Nation │ 138 │  8A   │ ████░░  │ techno    │ peak · exp │ ··· │
│ ● │ Sandstorm · Darude        │ 136 │  3A   │ █████░  │ eurodance │ explotarla │ ··· │
```

- El dot `●` tiene el color de energía del track
- BPM y Clave en `font-mono`
- Energía es una mini barra de 48px
- Click en fila → abre detail panel (no modal, panel lateral derecho)
- Columnas reordenables

### 4.3 Vista Grafo

```
┌─ SIDEBAR (colapsado, 48px) ──┐┌─ MAIN ────────────────────────────────┐
│ [≡]                          ││                                        │
│ [🔍]                         ││         ·  ·                           │
│ [🎛]                         ││       · [●]─────[●] ·                 │
│ [💬]                         ││      ·   │         │   ·               │
└──────────────────────────────┘│    [●]───[●]     [●]                  │
                                 │      ·       [●]     ·                │
                                 │         · ·     · ·                   │
                                 │                                        │
                                 │  ┌─ Track hover card ──────────────┐  │
                                 │  │ Kernkraft 400 · Zombie Nation   │  │
                                 │  │ 138 BPM · 8A · Energía 0.91    │  │
                                 │  │ [peak] [explotarla]             │  │
                                 │  │ 4 conexiones compatibles →      │  │
                                 │  └─────────────────────────────────┘  │
                                 │                                        │
                                 │  [●] Energía baja  [●] Media  [●] Peak│
                                 └────────────────────────────────────────┘
```

- Background: `#0A0A0F` puro (el grafo necesita máximo contraste)
- Sidebar colapsa automáticamente al entrar a esta vista
- Nodos: círculos de radio 8-14px según popularidad/uso en sets
- Conexiones: líneas de 1px, opacidad 0.3 en reposo, 0.8 en hover
- Hover en nodo: resalta el nodo + sus conexiones directas, resto se atenúa a 0.1
- Click en nodo: abre panel derecho con detalle del track y lista de conexiones
- Controles: zoom con scroll, pan con drag, botón "fit all" para resetear vista
- Filtros de la biblioteca aplican al grafo (nodos desaparecen con transición)

### 4.4 Importación Rekordbox

Modal centrado, 3 pasos:

```
Paso 1: Upload
──────────────
┌────────────────────────────────────────┐
│  Importar desde Rekordbox              │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │                                  │  │
│  │   ↑ Arrastrá tu archivo XML      │  │
│  │   o hacé click para seleccionar  │  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ¿Cómo exportar desde Rekordbox? →     │
└────────────────────────────────────────┘

Paso 2: Procesando (con progreso)
──────────────────────────────────
│  Encontramos 1.247 tracks              │
│  Enriqueciendo metadatos...            │
│                                        │
│  ████████████░░░░░░░░  847 / 1.247    │
│                                        │
│  ✓ Spotify API: 831 tracks             │
│  ~ IA inferida: 16 tracks              │
│  ○ Pendiente: 400 tracks               │

Paso 3: Resumen
───────────────
│  ✓ Importación completada              │
│                                        │
│  1.247 tracks importados               │
│  ├─ 831 enriquecidos vía Spotify       │
│  ├─ 16 inferidos por IA               │
│  └─ 0 sin metadatos                   │
│                                        │
│             [ Ver mi biblioteca ]      │
```

### 4.5 Agregar Track Manual

Panel lateral derecho (no modal), 380px:

```
┌─ Agregar Track ──────────────── [✕] ─┐
│                                       │
│  Artista *                            │
│  [ Zombie Nation              ]       │
│                                       │
│  Título *                             │
│  [ Kernkraft 400              ]       │
│                                       │
│          [ Buscar metadatos → ]       │
│                                       │
│  ── Resultado ──────────────────────  │
│                                       │
│  ✓ Metadatos encontrados              │
│    (Spotify · GetSongBPM)             │
│                                       │
│  BPM    Clave    Energía    Año       │
│  138    8A       0.91       1999      │
│                                       │
│  Género: techno, dance                │
│                                       │
│  Etiquetas DJ (generadas por IA)      │
│  [peak] [explotarla] [+]              │
│                                       │
│  Notas personales                     │
│  [ Funciona perfecto en el peak... ]  │
│                                       │
│           [ Guardar en biblioteca ]   │
└───────────────────────────────────────┘
```

### 4.6 Chat con IA

Panel derecho, 380px, slide-in:

```
┌─ Serendipia AI ──────────────── [✕] ─┐
│                                       │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │  Hola. Tenés 1.247 tracks.      │  │
│  │  ¿Qué estás buscando para       │  │
│  │  el set de hoy?                 │  │
│  └─────────────────────────────────┘  │
│                                       │
│  ┌─────────────────────────────────┐  │ ← mensaje usuario
│  │  Quiero explotar la pista,      │  │
│  │  estoy en 130 BPM              │  │
│  └─────────────────────────────────┘  │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │  Encontré 4 tracks perfectos:   │  │
│  │                                 │  │
│  │  ┌─────────────────────────┐    │  │
│  │  │● Kernkraft 400   138 8A │    │  │  ← track card compacta
│  │  └─────────────────────────┘    │  │
│  │  ┌─────────────────────────┐    │  │
│  │  │● Sandstorm       136 3A │    │  │
│  │  └─────────────────────────┘    │  │
│  │                                 │  │
│  │  Los dos arrancan en clave      │  │
│  │  compatible con 130 BPM...      │  │
│  └─────────────────────────────────┘  │
│                                       │
│  Sugerencias rápidas:                 │
│  [Bajarla suave] [Cierre emocional]   │
│                                       │
├───────────────────────────────────────┤
│  [ Escribí tu búsqueda...    ] [  → ] │
└───────────────────────────────────────┘
```

- Mensajes del usuario: alineados a la derecha, fondo `primary/20%`
- Mensajes de IA: alineados a la izquierda, fondo `surface-raised`
- Track cards dentro del chat: clickeables, agregan al set o muestran detalle
- Sugerencias rápidas: chips clickeables que precomponen el mensaje
- Input: Enter para enviar, Shift+Enter para nueva línea

---

## 5. Interacciones y Animaciones

```
── Transiciones globales ───────────────────────────────────
Panel slide-in:       200ms ease-out (translateX)
Modal appear:         150ms ease-out (opacity + scale 0.98 → 1)
Hover en card:        100ms ease (border-color, shadow)
Filtro aplicado:      250ms (tracks que desaparecen: fade + scale)
Grafo — hover nodo:   150ms (opacity de nodos no conectados)
Chat panel open:      200ms ease-out (width del main content)

── Micro-interacciones ─────────────────────────────────────
Botón click:          scale 0.97, 100ms
Tag/chip click:       scale 0.95 + color flash, 150ms
Track añadido:        nodo aparece en grafo con pop animation
Metadatos cargados:   campos aparecen con stagger (50ms entre cada uno)
```

---

## 6. Shortcuts de Teclado

| Shortcut | Acción |
|----------|--------|
| `⌘K` | Búsqueda global |
| `⌘N` | Agregar track nuevo |
| `⌘I` | Importar desde Rekordbox |
| `⌘/` | Abrir / cerrar chat de IA |
| `G` | Cambiar a vista Grafo |
| `L` | Cambiar a vista Lista |
| `Esc` | Cerrar panel / modal activo |
| `↑ ↓` | Navegar tracks en vista lista |
| `Space` | En lista: seleccionar track para playlist |

---

## 7. Estados de Metadatos (Visual)

| Estado (`metadata_status` / `metadata_source`) | Badge | Color |
|--------|-------|-------|
| Enriquecido vía Spotify (identidad) | `✓ Spotify` | Verde |
| Enriquecido vía GetSongBPM (BPM/clave) | `✓ BPM` | Verde |
| Inferido por IA | `~ IA` | Ámbar |
| Manual | `✎ Manual` | Azul info |
| Pendiente | `○ Pendiente` | Gris |

> Un track puede combinar fuentes (ej. identidad de Spotify + BPM de GetSongBPM). El badge prominente refleja el `metadata_source` del dato DJ-crítico (BPM/clave).

---

## 8. Responsive

El foco es **desktop** (1280px+). Los breakpoints son:

| Breakpoint | Comportamiento |
|-----------|---------------|
| 1280px+ | Layout completo como se describe arriba |
| 1024–1279px | Sidebar colapsa por defecto a 48px |
| 768–1023px | Layout de una columna, sidebar como drawer |
| < 768px | Fuera de scope para MVP |

---

## 9. Accesibilidad

- Contraste mínimo WCAG AA en todo el texto sobre fondos de color
- Todos los elementos interactivos tienen `focus-visible` estilizado (outline `primary`, 2px offset)
- Labels en todos los inputs
- Mensajes de error accesibles con `aria-live`
- Navegación por teclado completa (no depende de mouse)

---

*Design Spec — documento vivo. Actualizar con decisiones tomadas durante implementación.*