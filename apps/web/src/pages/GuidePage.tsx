import type { ReactNode } from 'react'
import { Btn } from '@/components/bits'
import { useTour } from '@/components/Tour'

function Section({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section className="grid grid-cols-[28px_1fr] gap-x-3 border-t border-line py-6">
      <span className="num pt-0.5 text-[12px] text-faint">{n}</span>
      <div>
        <h2 className="text-[15px] font-medium text-fg">{title}</h2>
        <div className="mt-2 space-y-2 text-[13px] leading-relaxed text-soft">{children}</div>
      </div>
    </section>
  )
}
const K = ({ children }: { children: ReactNode }) => <span className="num rounded-[3px] border border-line-strong px-1 text-[11.5px] text-fg">{children}</span>
const B = ({ children }: { children: ReactNode }) => <span className="text-fg">{children}</span>

export function GuidePage() {
  const start = useTour((s) => s.start)
  return (
    <div className="min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[680px] px-6 pb-16 pt-8">
        <h1 className="text-[22px] font-medium tracking-tight text-fg">Cómo se usa Serendipia</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-soft">
          Serendipia toma tu colección de rekordbox, la muestra como un mapa donde los temas parecidos quedan cerca, y te ayuda a armar sets por capítulos sin chocar tonalidades. No
          reemplaza a rekordbox: lo que armás acá vuelve a rekordbox para tocar.
        </p>
        <div className="mb-6 mt-4">
          <Btn variant="line" onClick={start}>
            Ver el recorrido completo de nuevo
          </Btn>
        </div>

        <Section n="1" title="Traé tu colección">
          <p>
            En rekordbox: <B>Archivo › Exportar colección en formato xml</B>. En Serendipia, soltá ese archivo en la pantalla de inicio o usá <B>Actualizar XML</B> en la Biblioteca.
          </p>
          <p>Trae temas, BPM, tonalidad, estrellas, comentarios y todas tus playlists con sus carpetas. Cuando agregues música en rekordbox, exportá de nuevo y actualizá: tus sets se conservan.</p>
          <p className="text-faint">Si un tema aparece sin tonalidad, es que rekordbox todavía no la analizó.</p>
        </Section>

        <Section n="2" title="Dejá que escuche tu música">
          <p>
            En la Biblioteca, <B>Analizar mi música</B>. Se abre el selector de archivos: elegí <B>la carpeta donde está tu música</B>, entera. No es el XML.
          </p>
          <p>
            El navegador pregunta si querés “subir” los archivos. Es el permiso para leerlos: el audio se analiza en tu compu y no se envía a ningún servidor. Tarda alrededor de medio
            segundo por tema la primera vez; después solo analiza los nuevos.
          </p>
          <p>Con esto aparecen el mapa por sonido, los Consejos y el botón para escuchar cada tema. Al recargar la página hay que volver a elegir la carpeta para escuchar.</p>
        </Section>

        <Section n="3" title="Leé el mapa">
          <p>
            Cada punto es un tema. <B>Cerca significa que suenan parecido.</B> Los grupos se arman solos y llevan el nombre del estilo que predomina. El anillo de afuera son los temas
            que no se parecen a nada de tu colección.
          </p>
          <p>
            Clic en un tema muestra sus vecinos más parecidos. Clic en el centro de un grupo lo selecciona entero. <K>Shift</K> + arrastrar selecciona una zona. De cualquier selección
            podés crear un capítulo.
          </p>
          <p className="text-faint">El mapa acierta bien el estilo y poco la vibra fina: úsalo para encontrar candidatos, no como veredicto.</p>
        </Section>

        <Section n="4" title="Armá el set por capítulos">
          <p>
            Un capítulo es un bloque de temas con la misma vibra: warm-up, build-up, peak, cierre. No fija el orden de la noche; te deja improvisar adentro de cada bloque y saltar al
            siguiente cuando la pista lo pide.
          </p>
          <p>
            Podés empezar de cero con uno o dos temas semilla, o usar <B>Abrir desde rekordbox</B>: una carpeta pasa a ser un set y cada playlist un capítulo. El Explorador de la derecha
            sugiere <B>Parecidos</B> al capítulo y <B>Siguiente</B>, lo que puede seguir al último tema por tonalidad y BPM.
          </p>
        </Section>

        <Section n="5" title="Ordená sin chocar">
          <p>
            En Sets, cambiá a <B>Orden</B>. Arrastrá los temas o usá <K>Alt</K> + <K>↑</K> <K>↓</K>. Entre tema y tema ves la regla de tonalidad que usa la mezcla, o una alerta si choca.
          </p>
          <p>
            Reglas de tonalidad (Camelot), de más segura a más abierta: misma, ±1, mismo número con la otra letra, ±2, ±5, y ±3 cambiando de letra.
          </p>
          <p>
            Elegí un tema y marcá qué es <B>en este set</B>: Abre, Peak, Cierra, Sí o sí, Extra, o con cuál va junto. <B>Ordenar</B> respeta esas marcas y <B>Recortar a</B> pasa a extras lo
            que sobra para una duración. <K>Cmd</K> + <K>Z</K> deshace.
          </p>
        </Section>

        <Section n="6" title="Volvé a rekordbox">
          <p>
            <B>Exportar a rekordbox</B> baja un XML con una carpeta con el nombre del set y una playlist por capítulo.
          </p>
          <p>
            En rekordbox: <B>Preferencias › Avanzado › Base de datos › rekordbox xml</B> y elegí ese archivo. En el panel izquierdo aparece “rekordbox xml” con la carpeta del set; clic
            derecho › Importar playlist.
          </p>
        </Section>

        <Section n="·" title="Tus datos">
          <p>La colección, las huellas de sonido y los sets se guardan en este navegador. No hay cuentas ni servidor: en otra compu u otro navegador empezás de cero.</p>
          <p className="text-faint">
            El análisis de sonido usa el modelo Discogs-EffNet de Essentia (Music Technology Group, Universitat Pompeu Fabra), con licencia CC BY-NC-SA 4.0, para uso no comercial.
          </p>
        </Section>
      </div>
    </div>
  )
}
