# 11 · Flujo de armado de sets

> 2026-11-13. Sale de releer las sesiones de terminal donde el autor clasificó música y armó varios sets con Claude entre septiembre y octubre de 2026.

## Cómo se hace hoy

1. **Descarga.** Tandas de 5 a 40 temas en `~/Downloads` (a veces en subcarpetas como `1102`).
2. **Clasificación, de a un tema.** Claude escucha nombre, sello, BPM y tonalidad, y propone un cajón (`Progressive/05 - DDTGS`). El autor responde casi siempre con una palabra: "si", "warm", "groovy", "DDTGS.", "lo borré". A veces describe el tema ("tranqui pero oscuro y profundo, con groove") y de ahí nace un cajón nuevo con su significado entre paréntesis.
   - Reglas que aparecen: mismo artista o EP en el mismo cajón; ante duplicado se queda el AIFF; renombrar a `Artista - Título (Mix) [Sello]`; etiquetas en el comentario (`WARM`, `CIERRE`, `Transitions - Digweed`).
   - Marca extra por tema para un set futuro: "va sí o sí al warm-up", "capaz", "no va", "candidato a abrir".
   - Al final pide la lista de qué quedó en cada carpeta, para cargarlo en rekordbox.
3. **rekordbox.** Importa, analiza y arma playlists de candidatos por vibra, con estrellas como energía. Le pasaba esas playlists a Claude como capturas de pantalla.
4. **Curaduría hablada.** Dice cuáles le gustan más, cuáles van sí o sí, cuáles son extra, con cuál abre, cuál es el peak, y restricciones como "este al final pero en el medio de la última tanda", "estos dos juntos", "los del mismo artista juntos", "cierro con tal tema". Muchas veces describe cada tema: energía, oscuro o brillante, progre o housy, dónde lo ve (principio, intermedio, final).
5. **Orden.** Claude propone el orden de menos a más con sus reglas Camelot, indicando la regla de cada paso, en bloques con "puertas" para poder improvisar. Siguen versiones de 1 h, 1 h 30 y 2 h, los extras ordenados de más a menos energía y una playlist de rescate ("SOS tranqui").
6. **Iteración.** Correcciones puntuales hasta el orden final, que pasa a mano a rekordbox.

Otras preguntas recurrentes: "¿con cuál no lo puedo tocar nunca?", "¿dónde meto este tema que es 4A?", "temas parecidos a este", "¿cuántos temas para 2 h?".

## Cómo entra en Serendipia

| Paso | Hoy | En Serendipia |
|---|---|---|
| Clasificar descargas | Claude en la terminal, de a uno | **Bandeja**: lista de descargas con reproducción, cajón sugerido por cercanía con lo que ya hay en cada cajón, y aceptar, cambiar o borrar con una tecla. Las sugerencias las puede hacer Claude con la descripción del tema. Mueve y renombra el archivo. Solo en la Mac. |
| Pasar a rekordbox | Capturas de pantalla | **XML**: se exporta la colección y se suelta en Serendipia. Ya hecho. |
| Partir de playlists ya armadas | Capturas + charla | **Abrir desde rekordbox**: una carpeta pasa a ser un set y cada playlist un capítulo. Ya hecho. |
| Partir de cero | Charla | Sets por capítulos con Parecidos, Siguiente y el Mapa. Ya hecho. |
| Notas por tema | Mensajes sueltos | **Marcas en el capítulo**: sí o sí, extra, abre, peak, cierre, "juntos con", y una nota libre. |
| Ordenar | Claude con reglas Camelot | **Ordenar** respeta las marcas: abre primero, cierre último, peak en el último tercio, pares juntos, extras al final de más a menos. Muestra la regla de cada paso. |
| Versiones por duración | Pedido a Claude | **Recortar a**: 1 h, 1 h 30 o 2 h, conservando los sí o sí. |
| Improvisar | "¿con cuál no va?" | Por tema, los que siguen bien y los que chocan dentro del capítulo. |
| Volver a rekordbox | A mano | **Exportar a rekordbox**: XML con carpeta del set y una playlist por capítulo. Ya hecho. |
| Charla libre | Claude en la terminal | **Asistente**: la frase ("este al final pero no último") se traduce a marcas y restricciones. Necesita una función en el servidor con la API de Claude. |

## Orden de construcción propuesto

1. Marcas por tema y Ordenar que las respete. Es lo que más tiempo ahorra y no depende de nada.
2. Recortar por duración y extras.
3. Bandeja de clasificación en modo local.
4. Asistente con Claude.

## Web y producto

La versión publicada no tiene backend: el XML se lee en el navegador y queda en IndexedDB, los sets en localStorage. Eso permite publicarla sin exponer bibliotecas ajenas y es la base para que cada DJ cargue su propio XML. Para venderla faltan: cuentas y sets sincronizados entre dispositivos, análisis de audio en el navegador (hoy solo existe en el escáner local) y escucha sin la Mac.
