# 13 · Roadmap

> 2026-11-16. Ordenado por lo que más acerca a dos metas: que el autor arme sus sets enteros acá, y que otros DJs puedan usarlo con su música.

## Hecho

- Biblioteca local con análisis de audio, XML de rekordbox en el navegador, publicación en Vercel.
- Galaxia: temas ubicados por sonido y tags, grupos con nombre, anillo de rarezas, recorrido de un set dibujado encima.
- Sets por capítulos, vista Orden con alertas de tonalidad, abrir desde rekordbox y exportar a rekordbox.
- Marcas por tema dentro de cada set (abre, peak, cierra, sí o sí, extra, junto a, nota), Ordenar que las respeta y recorte por duración.
- Consejos de categorización.
- Bandeja de descargas (local): sugiere hasta tres cajones por tema, propone el nombre, avisa duplicados y mueve o manda a la Papelera, de a un tema y con confirmación.

## Decisiones tomadas

- **Las marcas son del set, no del tema.** "Este abre" o "va con aquel" vale para ese set en particular.
- **Las estrellas de rekordbox no son energía global.** El autor las pone relativas a cada set (un 4 en un warm-up puede ser un 2 en un peak time). La energía general sale del audio; las estrellas se muestran aparte y solo mandan al ordenar una playlist donde casi todos los temas las tienen.
- **La tonalidad no se estima.** Los 196 temas sin tonalidad no son un problema de Serendipia: 170 están en rekordbox sin tonalidad analizada (casi todos MP3 de Tech House, Melodic e Indie Dance) y 26 no están en rekordbox. Se resuelve analizándolos ahí con la opción de tonalidad activada y exportando de nuevo.

## Etapa 1 · Que el flujo completo viva acá

Para el autor, en la versión local.

1. **Bandeja de descargas.** Hecha la primera versión. Falta: probarla moviendo una tanda real, crear cajones nuevos desde la bandeja, escribir etiquetas en el comentario (`WARM`, `CIERRE`) y vigilar la carpeta sola.
2. **Marcas al clasificar.** "Va sí o sí al warm-up", "candidato a abrir": se anotan en el momento y quedan como candidatos de un set.
3. **Energía a tu criterio.** Calibrar la estimación de energía con las correcciones manuales del autor, en lugar de las estrellas.
4. **Orden más fino.** Hoy Ordenar evita choques cuando puede, pero puede dejar un tema después del peak. Falta buscar el mejor orden completo y proponer versiones (1 h, 1 h 30, 2 h) y una playlist de rescate.
5. **Detalles de uso.** Deshacer, cues de escucha (intro, drop), renombrar grupos de la galaxia.

## Etapa 2 · Que lo usen otros DJs

Objetivo: un amigo entra a la URL, carga su música y tiene galaxia, sets y consejos sin instalar nada.

1. **Análisis en el navegador.** El mismo modelo de sonido (ONNX, 18 MB) corre en el navegador con onnxruntime-web. El DJ elige su carpeta de música y el audio nunca sale de su compu; solo se guardan las huellas. Hay que escribir un lector de AIFF, porque Chrome no lo decodifica.
2. **Cuentas y sincronización.** Supabase: login, y guardar sets, marcas y huellas (no audio) para que estén en cualquier dispositivo.
3. **Primer uso guiado.** Recorrido del producto dentro de la app y una página de cómo se usa: exportar el XML, elegir la carpeta, leer la galaxia, armar el primer set.
4. **Escucha en la web.** Con la carpeta elegida, el navegador puede reproducir los archivos locales sin subirlos.

Riesgo a resolver antes de cobrar: **la licencia del modelo de audio**. Los modelos de Essentia se publican para uso no comercial; para vender hace falta pedir licencia comercial a la universidad (MTG-UPF) o cambiar de modelo. Verificarlo es el primer paso de esta etapa.

## Orden acordado (2026-11-16)

1. Etapa 1 (local) y etapa 2 (DJs amigos).
2. App de escritorio y video en motion graphics, primero para uso propio.
3. Comercialización, más adelante: **averiguar un modelo de audio con licencia de uso comercial** (el actual es CC BY-NC-SA 4.0; MTG-UPF ofrece licencia propietaria a pedido), cobro y asistente.

## Etapa 3 · Producto

1. **App de escritorio** (Tauri) para el flujo de descargas: vigilar carpetas y mover archivos es frágil desde un navegador. La web queda como puerta de entrada.
2. **Video de presentación en motion graphics**, con un tema de progressive house de fondo y efectos de sonido de interfaz. Necesita música con licencia para uso comercial. Guion sugerido: el problema (miles de temas, 60 segundos para elegir), la galaxia armándose, un set por capítulos, la alerta de tonalidad, exportar a rekordbox.
3. **Cobro**: suscripción anual, como Djoid (99 € al año).
4. **Asistente conversacional**: frases como "este al final pero no último" traducidas a marcas, y la charla de curaduría tema por tema.

## Confiabilidad: ¿es el método o la categorización?

Experimento con validación cruzada (se esconde un quinto de los temas y se adivina dónde van con el resto):

| Qué se adivina | Acierta la primera | Entre las tres primeras |
|---|---|---|
| Carpeta de género (6) | 78% | 94% |
| Carpeta + cajón (21) | 33% | 65% |
| Cajón dentro de Progressive (5) | 41% | 82% |
| Cajón dentro de Tech House (6) | 44% | 81% |

Enseñarle los cajones (regresión sobre las huellas) rinde casi igual que mirar vecinos, así que el techo no es el algoritmo. Tres causas, en este orden:

1. **El modelo escucha estilo, no intención.** WARM, DEEP y DDTGS se diferencian por función en el set y por matices que un modelo de géneros no aprendió.
2. **Los cajones se solapan de verdad.** En las sesiones de clasificación el autor dudaba seguido entre dos ("warm o groovy de baja energía"). Que acierte entre tres opciones el 80% dice que los candidatos razonables son pocos.
3. **Algo de ruido en la categorización**, que es lo que muestra Consejos.

Cómo mejorarlo: revisar Consejos (limpia el ruido), sumar al parecido las medidas que sí separan vibra (energía, brillo, BPM) y, más adelante, afinar el modelo con los cajones del propio DJ. No hace falta recategorizar todo.

## Qué tan confiable es la galaxia

- De los 10 vecinos más parecidos de cada tema, 72% está en la misma carpeta de género del autor (azar: 31%). Para "suena al mismo estilo" es confiable.
- Para la vibra fina dentro de un género (los cajones) acierta 24%. No distingue bien un WARM de un DEEP.
- La lista de Parecidos es más fiel que la distancia en el dibujo: pasar de 1280 dimensiones a 2 siempre deforma, y dos temas pueden quedar lejos en el mapa siendo parecidos.
- Falla más con temas atípicos (acapellas, pop, ambient): son los que el modelo vio menos junto a música de pista.
- Mide sonido, no función: dos temas pueden sonar parecido y servir para momentos distintos del set.
