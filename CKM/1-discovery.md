# Serendipia — Discovery Document
> Versión 1.0 · Mayo 2026

---

## 1. Visión del Producto

**Serendipia** es un segundo cerebro para DJs. Una plataforma que combina análisis automático de metadatos musicales, visualización en red de la biblioteca, e inteligencia artificial conversacional para que cualquier DJ pueda preparar sets, redescubrir su música y tomar decisiones creativas en tiempo real.

> *"No sabés lo que vas a encontrar. Eso es lo mejor."*

---

## 2. El Problema

### Contexto
Un DJ profesional o semi-profesional maneja bibliotecas de entre 5.000 y 50.000 tracks. Preparar un set implica navegar esa biblioteca manualmente, recordar qué tracks mezclan bien entre sí, cuál es la energía de cada uno y cómo construir una narrativa musical coherente para la pista de baile.

### Dolores concretos

| Dolor | Impacto |
|-------|---------|
| Bibliotecas enormes sin estructura navegable | Tiempo perdido buscando en el momento |
| Metadatos incompletos o inexistentes | Imposible filtrar con precisión |
| No hay forma de "hablar" con la biblioteca | El DJ depende 100% de su memoria |
| Las herramientas son técnicas, no creativas | No entienden el lenguaje del DJ |
| Tracks underground fuera de los sistemas | Los edits y bootlegs quedan huérfanos |

### La pregunta que ningún software responde hoy
> *"Estoy en el peak de la noche, en 132 BPM, la pista está explotada. ¿Qué pongo ahora para no perderla?"*

---

## 3. El Usuario

### Perfil primario — DJ Profesional / Semi-Pro
- Toca en clubes, festivales o eventos privados de forma regular
- Biblioteca de 5.000 a 30.000 tracks
- Usa Rekordbox o Serato como software principal
- Invierte horas semanales en preparación de sets
- Paga por herramientas que le ahorren tiempo y mejoren su performance
- Conoce Mixed In Key, puede conocer DJoid

### Perfil secundario — DJ Hobbyist Avanzado
- Toca en eventos pequeños, streams o mezclas caseras
- Biblioteca de 500 a 5.000 tracks
- Más sensible al precio pero dispuesto a pagar por valor claro
- Menos conocimiento técnico, valora más la UX simple

### Lo que el usuario quiere lograr (Jobs To Be Done)
1. **Preparar sets más rápido** sin perder tiempo navegando listas
2. **Redescubrir tracks olvidados** que tienen potencial para el momento
3. **Mezclar con más confianza** sabiendo que los tracks son compatibles
4. **Experimentar** con combinaciones que no hubiese pensado solo
5. **Mantener su biblioteca organizada** sin trabajo manual constante

---

## 4. El Mercado

### Tamaño
- Mercado global de DJ software: **USD 500M+** en crecimiento
- DJs profesionales y semi-pro en Europa + Latam: **1M+**
- Willingness to pay validado por competencia: **€29–99/mes**

### Competencia

| Plataforma | Fortaleza | Limitación clave |
|-----------|-----------|-----------------|
| **DJoid** | Grafo visual, análisis de audio automático | Requiere archivo físico, sin IA conversacional, ~33 usuarios activos visibles |
| **Rekordbox** | Estándar de industria, integración Pioneer | Manual, cerrado, sin IA |
| **Mixed In Key** | Análisis de clave y energía confiable | Solo análisis, sin curaduría ni red |
| **Lexicon** | Gestión de metadata multi-plataforma | Sin grafo, sin IA conversacional |
| **Spotify** | Catálogo masivo, recomendaciones | No es para DJs, no usa biblioteca propia |

### Ventana de oportunidad
DJoid valida que el mercado existe y busca estas herramientas. Con muy poca tracción visible, el espacio para entrar con una solución más completa y mejor diseñada está abierto. La IA generativa habilita hoy lo que era imposible hace 2 años.

---

## 5. La Solución — Tres Pilares

### 🧠 Pilar 1: Cerebro (Metadatos automáticos)
Ingresás el nombre del track + artista. El sistema combina varias fuentes y genera automáticamente:
- BPM y clave musical (Camelot Wheel) vía **GetSongBPM**; identidad, año y género vía **Spotify**; energía/danceability vía **Claude**
- Etiquetas contextuales de DJ: `#explotarla` `#calentar` `#cierre` `#peak` `#emotional` (generadas por Claude)
- Funciona con tracks underground, edits y bootlegs donde no hay archivo ni datos en APIs: **Claude infiere los metadatos** — es el único camino para esos casos

### 🕸️ Pilar 2: Red (Grafo de conexiones)
Visualización interactiva donde:
- Cada track es un nodo
- Las conexiones representan compatibilidad (BPM cercano + clave armónica + energía similar)
- El DJ navega su biblioteca como un territorio, no como una lista
- Clusters revelan patrones que el DJ nunca hubiera visto manualmente

### 💬 Pilar 3: Conversación (IA en lenguaje natural)
Chat integrado que entiende el lenguaje del DJ:
- *"Dame algo para bajar desde 138 BPM sin perder la energía"*
- *"¿Qué mezcla bien después de Kernkraft 400?"*
- *"Necesito 5 tracks para el cierre emocional del set"*
- La IA busca en la biblioteca propia del DJ y responde con recomendaciones reales

---

## 6. Diferenciación Clave

| Característica | Serendipia | Competencia |
|---------------|-----------|-------------|
| Metadatos sin archivo físico | ✅ Solo nombre + artista | ❌ Requieren audio local |
| IA conversacional en lenguaje DJ | ✅ | ❌ |
| Tracks underground y edits | ✅ | ❌ Limitado a bases de datos |
| Etiquetas de momento del set | ✅ | ❌ Solo metadatos técnicos |
| Narrativa del set completo | ✅ | ❌ Listas planas |

---

## 7. Integración con Rekordbox

Rekordbox no tiene API pública oficial. Las opciones de integración son:

### Opción A — Importación XML *(Recomendada para MVP)*
1. El DJ exporta su biblioteca desde Rekordbox como XML (función nativa)
2. Serendipia importa ese XML con todos los tracks y metadatos existentes
3. La IA enriquece lo que falte automáticamente
4. Se realiza una vez al inicio, luego al agregar tracks nuevos

### Opción B — Exportación de Playlists
1. El DJ arma su set en Serendipia
2. Exporta como XML o M3U compatible con Rekordbox
3. Rekordbox importa la playlist lista para usar en los decks

### Opción C — Base de datos directa *(Fase avanzada)*
- Rekordbox usa SQLite internamente
- Proyectos open source permiten leer/escribir esa base sin exportar
- Mayor riesgo técnico, mayor fluidez — para versiones post-MVP

---

## 8. Casos de Uso Validados

1. **Preparación de set de club** — Estructura completa de set respetando energía y armonía
2. **Redescubrimiento de biblioteca** — Encontrar tracks olvidados con potencial
3. **Compatibilidad en vivo** — Siguiente track compatible en segundos
4. **Onboarding de tracks nuevos** — Carga masiva con metadatos generados automáticamente

---

## 9. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|-----------|
| Spotify ya deprecó audio-features (BPM/clave/energía) para apps nuevas | Resuelto | Arquitectura híbrida: GetSongBPM para BPM/clave, Claude para el resto; Spotify solo para identidad |
| GetSongBPM limita o cae | Media | Fallback a Claude (ya en el pipeline); evaluar MusicBrainz/AcousticBrainz como segunda fuente |
| Pioneer abre Rekordbox API | Baja | Adoptarla inmediatamente como ventaja |
| DJoid mejora con IA conversacional | Media | Velocidad de ejecución + mejor UX |
| Baja adopción por precio | Media | Freemium con límite de tracks |
| Tracks sin datos en ninguna API | Alta para underground | IA generativa como fallback de metadatos |

---

## 10. Métricas de Éxito (Discovery Phase)

- [ ] 50 entrevistas con DJs profesionales y semi-pro
- [ ] Validar willingness to pay > €15/mes en +60% de entrevistados
- [ ] Prototipo clickeable testeado con 10 DJs
- [ ] Tiempo de preparación de set reducido en prueba controlada
- [ ] NPS > 40 en beta cerrada

---

*Documento vivo — actualizar con aprendizajes de entrevistas y pruebas de usuario*
