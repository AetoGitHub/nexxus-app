/**
 * Miniatura (vista previa) de un archivo, generada en el navegador al subirlo: ahí el archivo todavía es local, no hay
 * CORS de Firebase que estorbe (el bucket no manda cabeceras CORS: una URL ya subida se puede mostrar, pero no leer).
 *
 * Capas, de la más fiel a la más barata (la capa 4 es el chip con ícono de siempre cuando no hay miniatura):
 * 1. PDF: `pdf.js` dibuja la primera página.
 * 2. docx/xlsx/pptx y ODF: son un zip y muchos traen una imagen de vista previa ya hecha (`docProps/thumbnail.jpeg`,
 *    en ODF `Thumbnails/thumbnail.png`); se lee sin renderizar nada. No está garantizada: depende de cómo se guardó.
 * 3. Sin vista previa embebida, se renderiza la primera página en el navegador: Word con `docx-preview`
 *    (`docx-thumbnail.util.ts`), Excel (primera hoja, `spreadsheet-thumbnail.util.ts`) y PowerPoint (primera diapositiva,
 *    aproximada, `presentation-thumbnail.util.ts`).
 * Las librerías se cargan bajo demanda, solo cuando se sube un archivo de ese tipo.
 */

/** Ancho de la miniatura (px); el alto sale proporcional. */
export const THUMBNAIL_WIDTH = 480
/** La miniatura se guarda junto al archivo con este sufijo: `{nombre final del archivo}.thumb.png`. */
export const THUMBNAIL_SUFFIX = '.thumb.png'

/** Más que esto es mala señal (miniatura rara o enorme): no se sube. */
const MAX_THUMBNAIL_BYTES = 1024 * 1024
/** Generar la miniatura no debe retrasar la subida: pasado este tiempo se sube el archivo sin ella. */
const GENERATION_TIMEOUT_MS = 10_000

const OFFICE_EXTENSIONS = new Set(['docx', 'docm', 'dotx', 'xlsx', 'xlsm', 'xltx', 'pptx', 'pptm', 'potx', 'ppsx'])
const ODF_EXTENSIONS = new Set(['odt', 'ods', 'odp'])
/** Nombres, dentro del zip, donde los documentos guardan su vista previa. */
const EMBEDDED_THUMBNAIL_ENTRIES = [
  'docProps/thumbnail.jpeg',
  'docProps/thumbnail.jpg',
  'docProps/thumbnail.png',
  'Thumbnails/thumbnail.png',
]

export function thumbnailFileNameFor(fileName: string): string {
  return `${fileName}${THUMBNAIL_SUFFIX}`
}

function extensionOf(fileName: string): string {
  return fileName.toLowerCase().split('.').pop() ?? ''
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/png'))
}

function createWhiteCanvas(width: number, height: number): { canvas: HTMLCanvasElement, context: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas 2D no disponible')
  }
  // Fondo blanco: sin él, un PDF o un PNG con transparencia se vería negro en modo oscuro.
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  return { canvas, context }
}

/** Capa 1: primera página de un PDF. */
async function pdfThumbnail(file: File): Promise<Blob | null> {
  // Build «legacy»: funciona también en Safari/iOS algo antiguos (la PWA se usa en celulares).
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const workerUrl = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  try {
    const page = await document.getPage(1)
    const baseViewport = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: THUMBNAIL_WIDTH / baseViewport.width })
    const { canvas, context } = createWhiteCanvas(viewport.width, viewport.height)
    await page.render({ canvasContext: context, viewport }).promise
    return await canvasToPng(canvas)
  }
  finally {
    void document.destroy()
  }
}

/** Reduce una imagen a `THUMBNAIL_WIDTH` (nunca la agranda) y la devuelve como PNG con fondo blanco. */
async function scaleToPng(image: Blob): Promise<Blob | null> {
  const bitmap = await createImageBitmap(image)
  try {
    const scale = Math.min(1, THUMBNAIL_WIDTH / bitmap.width)
    const { canvas, context } = createWhiteCanvas(bitmap.width * scale, bitmap.height * scale)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return await canvasToPng(canvas)
  }
  finally {
    bitmap.close()
  }
}

/** Capa 2: la vista previa que el propio documento (Office u ODF) lleva dentro del zip, si la trae. */
async function embeddedThumbnail(file: File): Promise<Blob | null> {
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(file)
  const entry = EMBEDDED_THUMBNAIL_ENTRIES.map(name => zip.file(name)).find(Boolean)
  if (!entry) {
    return null
  }
  // Una vista previa .wmf/.emf no se puede dibujar aquí: createImageBitmap falla y se queda sin miniatura.
  return scaleToPng(await entry.async('blob'))
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Tiempo agotado generando la miniatura')), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

const WORD_EXTENSIONS = new Set(['docx', 'docm', 'dotx'])
const EXCEL_EXTENSIONS = new Set(['xlsx', 'xlsm', 'xltx'])
const POWERPOINT_EXTENSIONS = new Set(['pptx', 'pptm', 'ppsx', 'potx'])

/** Capa 3: Office sin vista previa embebida; se dibuja su primera página, hoja o diapositiva. */
async function renderedThumbnail(file: File, extension: string): Promise<Blob | null> {
  if (WORD_EXTENSIONS.has(extension)) {
    const { renderDocxThumbnail } = await import('~/shared/utils/docx-thumbnail.util')
    return renderDocxThumbnail(file, THUMBNAIL_WIDTH)
  }
  if (EXCEL_EXTENSIONS.has(extension)) {
    const { renderSpreadsheetThumbnail } = await import('~/shared/utils/spreadsheet-thumbnail.util')
    return renderSpreadsheetThumbnail(file, THUMBNAIL_WIDTH)
  }
  if (POWERPOINT_EXTENSIONS.has(extension)) {
    const { renderPresentationThumbnail } = await import('~/shared/utils/presentation-thumbnail.util')
    return renderPresentationThumbnail(file, THUMBNAIL_WIDTH)
  }
  return null
}

/** Capas 2 y 3 para Office/ODF: la vista previa embebida si existe y, si no, el renderizado. */
async function officeThumbnail(file: File, extension: string): Promise<Blob | null> {
  return (await embeddedThumbnail(file)) ?? renderedThumbnail(file, extension)
}

/** Tipo de archivo que sabemos miniaturizar (para no cargar nada con los demás). */
export function canGenerateThumbnail(file: File): boolean {
  const extension = extensionOf(file.name)
  return extension === 'pdf'
    || file.type === 'application/pdf'
    || OFFICE_EXTENSIONS.has(extension)
    || ODF_EXTENSIONS.has(extension)
}

/**
 * Miniatura PNG de la primera página / vista previa del archivo, o `null` si no se pudo (tipo sin soporte, archivo
 * protegido o dañado, sin vista previa embebida, tiempo agotado). Nunca lanza: la subida no depende de ella.
 */
export async function generateFileThumbnail(file: File): Promise<Blob | null> {
  if (!import.meta.client || !canGenerateThumbnail(file)) {
    return null
  }

  const extension = extensionOf(file.name)
  const isPdf = extension === 'pdf' || file.type === 'application/pdf'

  try {
    const thumbnail = await withTimeout(isPdf ? pdfThumbnail(file) : officeThumbnail(file, extension), GENERATION_TIMEOUT_MS)
    return thumbnail && thumbnail.size <= MAX_THUMBNAIL_BYTES ? thumbnail : null
  }
  catch {
    return null
  }
}
