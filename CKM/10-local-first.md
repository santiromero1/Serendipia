# 10 · Retorno: local primero

> Decisión del 2026-11-12. Reemplaza, mientras dure esta etapa, lo que los specs 2 a 9 dicen sobre Spotify, GetSongBPM, Supabase, backend y chat.

## Decisión

Serendipia vuelve como herramienta personal que lee la música del disco. No hay backend, cuentas ni servicios externos. La métrica de éxito es que el autor la use para ver su biblioteca y armar sus sets.

Motivos:

- Los datos que importan ya están en el disco: carpetas por género, cajones por vibra (`NN - CÓDIGO`), tags de archivo, comentarios (`WARM`, `CIERRE`, `Transitions - Digweed`) y el análisis de rekordbox.
- Las audio features de Spotify (energy, danceability, valence) dejaron de estar disponibles para apps nuevas en noviembre de 2024, así que el plan original de enriquecer por Spotify no es viable.
- La referencia de producto es Djoid, que también analiza todo en local.

## Qué se construye

| Pieza | Dónde | Qué hace |
|---|---|---|
| Escáner | `apps/web/scripts/scan-library.mjs` | Recorre la carpeta de música en solo lectura. Saca artista, título y sello del nombre de archivo, género y cajón de las carpetas, BPM, tonalidad y comentario de los tags, y analiza el audio con ffmpeg. Escribe `.library-cache/data/` (fuera de `public/` e ignorado por git, para que nunca entre al build). |
| XML en el navegador | `src/lib/rekordbox.ts` | La versión web lee el XML de rekordbox en el navegador y lo guarda en IndexedDB. Mismos ids que el escáner, así que en la Mac se suma el análisis de audio. Ver 11-flujo-de-sets.md. |
| Biblioteca | `/` | Tabla con filtros: rueda Camelot, BPM, energía, bailabilidad, brillo, género, cajón, etiquetas. |
| Mapa | `/mapa` | Cada tema es un punto. Modo Cercanía (proyección de sonido, género y cajón) y modo Ejes. Selección por zona que crea un capítulo. |
| Sets | `/sets` | Capítulos como filas horizontales, explorador con Parecidos, Siguiente y Buscar, curva de energía, orden automático y export M3U8. |

## Datos por tema

- **Energía, bailabilidad y brillo**: escala 1 a 10, relativa a la biblioteca (posición por ranking). Se estiman del audio y se pueden corregir a mano desde el panel de detalle; la corrección queda en el navegador.
  - Energía: densidad de ataques, volumen, agudos y BPM.
  - Bailabilidad: regularidad del bombo, densidad de ataques, peso de graves y estabilidad.
  - Brillo (oscuro a brillante): centroide espectral y agudos.
- **Estrellas de rekordbox**: cuando existen, la energía pasa a ser estrellas × 2.
- **Tonalidad y BPM**: rekordbox (si se escanea con `--xml`) > tag del archivo > BPM estimado. La tonalidad no se estima.

## Reglas de mezcla

Camelot extendido del autor, de más segura a más abierta: misma, ±1, A↔B, ±2, ±5, ±3 con cambio de letra. Cada unión entre dos temas muestra qué regla usa, o `choca` si no hay ninguna. "Siguiente" exige regla válida y BPM a ±6.

## Uso

```bash
cd apps/web
npm run scan                                   # ~/Music/MUSICA
npm run scan -- --xml ~/Downloads/rekordbox.xml   # suma tonalidades, estrellas y playlists de rekordbox
npm run dev
```

Requiere `ffmpeg` en el PATH. El análisis de audio se guarda en `.library-cache/`, así que solo la primera pasada es lenta.

## Exportar el set como carpeta de rekordbox (implementado)

Pedido del autor (2026-11-12): exportar un solo archivo que se pueda meter de vuelta en rekordbox como **una carpeta con el nombre del set y, adentro, una playlist por capítulo**.

Cómo: el botón "Exportar a rekordbox" del set genera un XML de rekordbox (`DJ_PLAYLISTS`), porque el M3U8 es plano y no admite carpetas. Los capítulos vacíos no se exportan. El M3U8 queda para exportar un capítulo suelto.

- `COLLECTION`: un `TRACK` por tema del set, con `TrackID`, `Name`, `Artist` y `Location` (`file://localhost/...` con la ruta absoluta codificada). Sin cues, grilla ni tonalidad, para no pisar el análisis que ya tiene rekordbox.
- `PLAYLISTS`: `NODE ROOT` > `NODE Type="0"` (carpeta, nombre del set) > un `NODE Type="1" KeyType="0"` por capítulo, con sus `TRACK Key="<TrackID>"` en orden.
- En rekordbox: Preferencias > Avanzado > Base de datos > rekordbox xml, apuntar al archivo; en el árbol "rekordbox xml" aparece la carpeta; clic derecho > Importar playlist.

A verificar importando en rekordbox: que rekordbox empareje por ruta los temas que ya están en la colección sin duplicarlos ni tocar sus cues.

## Pendiente

- Validar el import del XML de rekordbox con un export real (el parser está escrito, no probado con datos).
- Estimar tonalidad para los temas sin tag cuando no hay XML.
- Agrupado automático (auto-group) y playlists de rekordbox como punto de partida de un set.
- Calibrar la energía estimada contra las estrellas cuando haya suficientes temas calificados.
