# 12 · Galaxia: ubicar los temas por cómo suenan

> 2026-11-16. Responde dos pedidos: que el mapa se vea como un disco con centro, y que funcione para alguien que no categorizó su música.

## El problema

Poner cada tema en un punto del plano de modo que los parecidos queden cerca y los de un mismo género formen zonas, usando solo el audio. Sin carpetas, sin tags, sin playlists.

## Cómo se resuelve

Son cuatro pasos, cada uno con una razón.

### 1. Huella sonora (de audio a vector)

Medidas simples como energía, brillo o BPM no alcanzan para separar estilos: dos temas pueden tener la misma energía y sonar a mundos distintos. Lo que funciona es una red neuronal entrenada para reconocer estilos, de la que se toma la capa anterior a la respuesta: un vector donde la distancia ya significa "suena parecido".

Usamos **Discogs-EffNet** (Essentia, MTG-UPF): entrenada con unos 4 millones de temas de Discogs para distinguir 400 estilos, muchos de electrónica (Progressive House, Deep House, Tech House, Minimal Techno...). Por tema devuelve:

- un vector de 1280 dimensiones (la huella),
- la probabilidad de cada uno de los 400 estilos.

El modelo escucha parches de 2 segundos de espectrograma mel; tomamos hasta 40 repartidos por el cuerpo del tema y promediamos. Tarda unos 0,3 s por tema en una notebook.

### 2. Parecido relativo a tu biblioteca

A todas las huellas se les resta la huella promedio de la biblioteca y se normalizan. El parecido es el coseno entre esos vectores. Restar el promedio importa: en una biblioteca toda de house, todos los temas se parecen entre sí para el modelo; centrar hace que la distancia mida en qué se diferencia cada tema del promedio de esa colección.

### 3. Grafo de vecinos mutuos y grupos

Dos temas se conectan solo si cada uno está entre los 10 más parecidos del otro. La condición mutua evita que un tema genérico termine conectado con todos. El 6% de temas menos parecido a sus vecinos se marca como raro y queda sin conexiones.

Sobre ese grafo se buscan comunidades con Louvain, que encuentra grupos densamente conectados sin que haya que decir cuántos. Cada grupo de 5 o más temas recibe como nombre el estilo que el modelo más reconoce entre sus miembros; si dos grupos comparten nombre, se distinguen por su segundo estilo o por su energía.

### 4. Disposición por fuerzas

Es el mismo principio de la vista de grafo de Obsidian que sirvió de referencia:

- cada conexión es un resorte, más fuerte cuanto más parecidos son los temas;
- cada tema está unido al centro de su grupo, lo que arma las estrellas;
- los centros de grupos parecidos entre sí también están unidos, así los grupos afines quedan vecinos;
- todo se repele un poco y hay una gravedad hacia el centro, que es lo que da el disco.

Los temas sin grupo se ubican en un anillo exterior, cada uno del lado del tema agrupado al que más se parece. Lectura del mapa: el centro es el núcleo del sonido de la biblioteca, el borde son las rarezas.

Por qué fuerzas y no UMAP o t-SNE directo: esas proyecciones ubican bien los vecinos pero dan manchas de forma arbitraria y no dejan dibujar la red. Las fuerzas trabajan sobre el mismo grafo de vecinos, respetan las conexiones que se dibujan y producen la forma circular buscada. Las posiciones iniciales salen de las dos primeras componentes principales, así el resultado es estable entre corridas.

## Qué tan bien funciona

Medido en la biblioteca del autor (700 temas analizados), tomando sus carpetas como referencia y preguntando qué fracción de los 10 vecinos más cercanos de cada tema comparte carpeta:

| | Huella sonora | Medidas simples | Azar |
|---|---|---|---|
| Mismo género (carpeta raíz) | 66% | 49% | 31% |
| Mismo cajón (subcarpeta por vibra) | 21% | 13% | 7% |

### Género y sello de los tags

Los archivos comprados traen género y sello en sus tags, y el XML de rekordbox también. En esta biblioteca, 575 de 709 temas tienen género y 567 tienen sello (279 sellos distintos; 53 con tres o más temas).

- El género de Beatport es fiable: los 147 temas etiquetados "Progressive House" están en la carpeta Progressive. Los de otras fuentes no dicen nada ("Electro", "Dance", "Music") y se ignoran.
- Se suman al parecido sonoro como un empujón: +0,25 si comparten género del tag y +0,20 si comparten sello, sobre un coseno que entre vecinos ronda 0,5 a 0,9. El sonido sigue mandando.

| | Solo huella | Huella + tags |
|---|---|---|
| Mismo género | 66% | 72% |
| Mismo cajón | 21% | 24% |

La mejora es chica porque la huella ya captura casi todo lo que el género del tag dice. Con pesos más altos sube un poco más (74% y 25%), pero el mapa se parte en grupos por sello. La comparación de género es algo circular: las carpetas se armaron mirando esos mismos tags.

Lectura: sin ninguna categorización, el audio recupera bien el género. Los cajones por vibra dentro de un género (WARM, DEEP, DDTGS) se recuperan poco: son criterio personal del DJ y el modelo no los ve. Categorizar sigue aportando; lo que cambia es que ya no hace falta para tener un mapa útil.

## En la app

- **Mapa > Galaxia**: disco con grupos nombrados y red tenue. Color opcional por carpetas propias, estilo detectado, energía o tonalidad. Clic en un grupo lo selecciona y permite crear un capítulo.
- **Parecidos, Siguiente y vecinos** usan la huella (comprimida a 48 componentes principales) en lugar de las medidas simples, y ya no dependen de las carpetas.
- **Detalle del tema**: "Suena a" con el estilo detectado.

## Límites

- La huella necesita el audio, así que hoy solo existe en la versión local (`npm run scan`). La versión web, que solo lee el XML, sigue con el mapa anterior.
- Para un producto donde cada DJ analiza su música sin instalar nada, el mismo modelo se puede correr en el navegador (formato ONNX, 18 MB) leyendo los archivos de su disco.
- Los nombres de los grupos son los de Discogs y a veces no coinciden con cómo un DJ llama a su música.
