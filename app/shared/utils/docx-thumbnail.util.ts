/**
 * Miniatura de la primera página de un .docx que NO trae vista previa embebida (los de Word casi nunca la traen).
 *
 * `docx-preview` convierte el .docx en HTML (sin servidor, todo en el navegador) dentro de un contenedor fuera de
 * pantalla con el ancho de una hoja carta; la primera página se rasteriza a PNG con `html-to-image` (SVG foreignObject: lo dibuja el propio navegador, así que entiende
 * cualquier CSS moderno; `html2canvas` 1.4 se descartó porque revienta con los colores `oklch()` de Tailwind 4).
 *
 * Es una aproximación, no Word: las fuentes que no estén instaladas en el dispositivo (Calibri, Cambria...) se
 * sustituyen por otras, así que saltos de línea y de página pueden variar un poco; los gráficos SmartArt, fórmulas
 * y algunos efectos de WordArt no se dibujan. Sirve como vista previa para reconocer el documento.
 *
 * Nunca lanza: ante cualquier fallo (archivo dañado o protegido, tiempo agotado, demasiado grande) devuelve `null`.
 * Las librerías se cargan bajo demanda, solo al subir un .docx.
 */

/** Ancho de una hoja carta a 96 dpi (8.5 in). El renderizado se hace a este ancho y luego se reduce al pedido. */
const LETTER_WIDTH_PX = 816
/** Alto de una hoja carta a 96 dpi (11 in), por si el documento no declara el de su página. */
const LETTER_HEIGHT_PX = 1056
/** Un .docx más grande que esto tarda demasiado en convertirse a HTML: se sube sin miniatura. */
const MAX_DOCX_BYTES = 10 * 1024 * 1024
/** Tiempo máximo de todo el proceso (el llamador también pone su propio tope). */
const RENDER_TIMEOUT_MS = 8_000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Tiempo agotado renderizando el docx')), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/png'))
}

/** Espera a que las imágenes de la página estén decodificadas (si una falla, no bloquea: se dibuja sin ella). */
async function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll('img'))
  await Promise.all(images.map(image => image.decode().catch(() => undefined)))
}

async function renderFirstPage(file: File, width: number, host: HTMLElement): Promise<Blob | null> {
  const [{ renderAsync }, { toCanvas }] = await Promise.all([
    import('docx-preview'),
    import('html-to-image'),
  ])

  const styles = document.createElement('div')
  const body = document.createElement('div')
  host.append(styles, body)

  await renderAsync(file, body, styles, {
    className: 'docx-thumb',
    inWrapper: false, // sin el fondo gris ni el padding del visor: solo las hojas
    breakPages: true,
    ignoreLastRenderedPageBreak: true,
    renderHeaders: true,
    renderFooters: true,
    renderFootnotes: false,
    renderEndnotes: false,
    renderComments: false,
    useBase64URL: true, // data: URI en vez de blob: URL, para no dejar URLs sin revocar
    experimental: false,
  })

  const page = body.querySelector<HTMLElement>('section.docx-thumb')
  if (!page) {
    return null
  }
  await waitForImages(page)

  // La página mide lo que declara el documento (min-height); si el contenido la desborda, se recorta a una hoja.
  const pageWidth = page.offsetWidth || LETTER_WIDTH_PX
  const declaredHeight = Number.parseFloat(getComputedStyle(page).minHeight) // en px (el estilo inline viene en pt)
  const pageHeight = Number.isFinite(declaredHeight) && declaredHeight > 0
    ? Math.min(declaredHeight, pageWidth * 3)
    : LETTER_HEIGHT_PX

  const canvas = await toCanvas(page, {
    backgroundColor: '#ffffff',
    pixelRatio: width / pageWidth,
    width: pageWidth,
    height: pageHeight,
    skipFonts: true, // no recorrer ni descargar las @font-face de la app: la miniatura usa las fuentes del sistema
    cacheBust: false,
  })
  return await canvasToPng(canvas)
}

/**
 * PNG de la primera página de un .docx, de `width` px de ancho (alto proporcional a la hoja), o `null` si no se pudo.
 * Solo .docx/.docm/.dotx (no el .doc binario antiguo).
 */
export async function renderDocxThumbnail(file: File, width: number): Promise<Blob | null> {
  if (!import.meta.client || !Number.isFinite(width) || width <= 0 || file.size === 0 || file.size > MAX_DOCX_BYTES) {
    return null
  }

  // Contenedor fuera de pantalla, con el ancho de una hoja carta. Sin `display: none`: el navegador debe poder medir.
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = `position:fixed;top:0;left:-${LETTER_WIDTH_PX * 3}px;width:${LETTER_WIDTH_PX}px;`
    + 'background:#ffffff;color:#000000;pointer-events:none;overflow:visible;'
  document.body.append(host)

  try {
    return await withTimeout(renderFirstPage(file, width, host), RENDER_TIMEOUT_MS)
  }
  catch (error) {
    if (import.meta.dev) {
      console.debug('[docx-thumbnail] sin miniatura:', error)
    }
    return null
  }
  finally {
    host.remove()
  }
}
