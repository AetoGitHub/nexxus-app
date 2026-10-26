/**
 * Miniatura de una hoja de cálculo (.xlsx/.xlsm/.xltx) que NO trae vista previa embebida: dibuja la primera hoja visible
 * (primeras ~25 filas x ~10 columnas del área con datos) como una tabla, con los valores, formato numérico/fecha básico,
 * negritas, colores de texto/relleno, anchos y altos del archivo.
 *
 * Decisiones:
 * - Se lee el .xlsx con JSZip (ya es dependencia del proyecto) y un parser propio de las pocas partes que hacen falta
 *   (workbook, sharedStrings, styles, theme, la hoja). No se usa `xlsx` (SheetJS 0.18.5 de npm tiene CVEs y ya no se
 *   publica ahí) ni `exceljs` (~1 MB de bundle, dependencias de Node, última versión en 2024) ni `read-excel-file`
 *   (paquete de varios MB con workers): para ver solo la primera hoja no se justifica cargar un motor completo.
 * - Se pinta directo en un canvas 2D (sin HTML intermedio ni html2canvas): no depende de CSS, fuentes cargadas ni de
 *   foreignObject, es rápido y determinista.
 * - Solo se parsean las primeras filas de la hoja (se corta el XML), así una hoja de 100 mil filas no pesa más.
 * - Nunca lanza: ante cualquier fallo (archivo dañado, protegido con contraseña, hoja vacía, demasiado grande) devuelve
 *   `null` y el chip normal sigue funcionando.
 */

const MAX_FILE_BYTES = 25 * 1024 * 1024
/** Tope de bytes descomprimidos por parte del zip (protege contra zip-bombs). */
const MAX_PART_BYTES = 80 * 1024 * 1024
const MAX_ROWS = 25
const MAX_COLUMNS = 10
/** Filas de la hoja que se parsean para ubicar el inicio de los datos. */
const SCAN_ROWS = 60
/** Ancho natural máximo (px) de las columnas mostradas antes de escalar. */
const MAX_NATURAL_WIDTH = 1600
const DEFAULT_COLUMN_PX = 64
const DEFAULT_ROW_PX = 20
const FONT_FAMILY = 'Calibri, "Segoe UI", Arial, Helvetica, sans-serif'

const NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

interface CellStyle {
  bold: boolean
  italic: boolean
  fontPx: number
  color: string | null
  fill: string | null
  numFmtId: number
  align: string | null
}

interface CellData {
  text: string
  /** number: se alinea a la derecha por defecto; bool/error: centrado. */
  kind: 'text' | 'number' | 'bool' | 'error'
  style: CellStyle
  /** Valor numérico con formato General: se acorta si no cabe en la columna, como hace Excel. */
  general?: number
}

type ZipLike = { file: (name: string) => ZipEntryLike | null }
interface ZipEntryLike {
  async: (type: 'string') => Promise<string>
}

// ---------------------------------------------------------------------------------------------------- XML / utilidades

function parseXml(text: string): Document {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) {
    throw new Error('XML inválido')
  }
  return doc
}

function elements(parent: Document | Element, name: string): Element[] {
  return Array.from(parent.getElementsByTagNameNS('*', name))
}

function firstElement(parent: Document | Element | null | undefined, name: string): Element | null {
  return parent ? parent.getElementsByTagNameNS('*', name)[0] ?? null : null
}

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity: string) => {
    switch (entity.toLowerCase()) {
      case 'amp': return '&'
      case 'lt': return '<'
      case 'gt': return '>'
      case 'quot': return '"'
      case 'apos': return '\''
      default: {
        const code = entity[1]!.toLowerCase() === 'x' ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10)
        return Number.isFinite(code) && code > 0 && code <= 0x10FFFF ? String.fromCodePoint(code) : ''
      }
    }
  })
}

async function readPart(zip: ZipLike, name: string): Promise<string | null> {
  const entry = zip.file(name)
  if (!entry) {
    return null
  }
  const size = (entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize
  if (typeof size === 'number' && size > MAX_PART_BYTES) {
    throw new Error('Parte del zip demasiado grande')
  }
  return entry.async('string')
}

function columnIndex(letters: string): number {
  let index = 0
  for (const char of letters.toUpperCase()) {
    index = index * 26 + (char.charCodeAt(0) - 64)
  }
  return index - 1
}

function parseRef(ref: string): { col: number, row: number } | null {
  const match = /^\$?([A-Z]{1,3})\$?(\d+)$/i.exec(ref)
  return match ? { col: columnIndex(match[1]!), row: Number.parseInt(match[2]!, 10) } : null
}

// -------------------------------------------------------------------------------------------------------------- color

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '').slice(-6)
  return [0, 2, 4].map(i => Number.parseInt(value.slice(i, i + 2), 16) || 0) as [number, number, number]
}

function applyTint(hex: string, tint: number): string {
  const [r, g, b] = hexToRgb(hex).map(v => v / 255) as [number, number, number]
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  let l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) {
      h = (g - b) / d + (g < b ? 6 : 0)
    }
    else if (max === g) {
      h = (b - r) / d + 2
    }
    else {
      h = (r - g) / d + 4
    }
    h /= 6
  }
  l = tint < 0 ? l * (1 + tint) : l * (1 - tint) + tint
  const hue = (p: number, q: number, t: number) => {
    const tt = t < 0 ? t + 1 : t > 1 ? t - 1 : t
    if (tt < 1 / 6) {
      return p + (q - p) * 6 * tt
    }
    if (tt < 1 / 2) {
      return q
    }
    if (tt < 2 / 3) {
      return p + (q - p) * (2 / 3 - tt) * 6
    }
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const rgb = s === 0 ? [l, l, l] : [hue(p, q, h + 1 / 3), hue(p, q, h), hue(p, q, h - 1 / 3)]
  return `#${rgb.map(v => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('')}`
}

const INDEXED_COLORS: Record<number, string> = {
  8: '000000', 9: 'FFFFFF', 10: 'FF0000', 11: '00FF00', 12: '0000FF', 13: 'FFFF00', 14: 'FF00FF', 15: '00FFFF',
}

/** Colores del tema en el orden que usa Excel para `theme="n"`: lt1, dk1, lt2, dk2, accent1-6. */
function parseThemePalette(themeXml: string | null): string[] {
  const fallback = ['FFFFFF', '000000', 'E7E6E6', '44546A', '4472C4', 'ED7D31', 'A5A5A5', 'FFC000', '5B9BD5', '70AD47']
  if (!themeXml) {
    return fallback
  }
  try {
    const scheme = firstElement(parseXml(themeXml), 'clrScheme')
    if (!scheme) {
      return fallback
    }
    const read = (name: string, fb: string): string => {
      const node = firstElement(scheme, name)?.firstElementChild
      // `sysClr` trae val="windowText" y el color real en lastClr; `srgbClr` trae el hex en val.
      const value = node?.getAttribute('lastClr') ?? node?.getAttribute('val') ?? ''
      return /^[0-9a-f]{6}$/i.test(value) ? value.toUpperCase() : fb
    }
    return [
      read('lt1', 'FFFFFF'), read('dk1', '000000'), read('lt2', 'E7E6E6'), read('dk2', '44546A'),
      read('accent1', '4472C4'), read('accent2', 'ED7D31'), read('accent3', 'A5A5A5'),
      read('accent4', 'FFC000'), read('accent5', '5B9BD5'), read('accent6', '70AD47'),
    ]
  }
  catch {
    return fallback
  }
}

function resolveColor(node: Element | null, palette: string[]): string | null {
  if (!node) {
    return null
  }
  const rgb = node.getAttribute('rgb')
  let base: string | null = null
  if (rgb && rgb.length >= 6) {
    base = `#${rgb.slice(-6)}`
  }
  else if (node.hasAttribute('theme')) {
    const color = palette[Number.parseInt(node.getAttribute('theme')!, 10)]
    base = color ? `#${color}` : null
  }
  else if (node.hasAttribute('indexed')) {
    const color = INDEXED_COLORS[Number.parseInt(node.getAttribute('indexed')!, 10)]
    base = color ? `#${color}` : null
  }
  if (!base) {
    return null
  }
  const tint = Number.parseFloat(node.getAttribute('tint') ?? '0')
  return tint ? applyTint(base, tint) : base
}

// ------------------------------------------------------------------------------------------------------------ estilos

interface Styles {
  xfs: CellStyle[]
  customFormats: Map<number, string>
}

const DEFAULT_STYLE: CellStyle = { bold: false, italic: false, fontPx: 14.67, color: null, fill: null, numFmtId: 0, align: null }

function parseStyles(stylesXml: string | null, palette: string[]): Styles {
  const result: Styles = { xfs: [], customFormats: new Map() }
  if (!stylesXml) {
    return result
  }
  const doc = parseXml(stylesXml)
  for (const numFmt of elements(doc, 'numFmt')) {
    result.customFormats.set(Number.parseInt(numFmt.getAttribute('numFmtId') ?? '-1', 10), numFmt.getAttribute('formatCode') ?? '')
  }
  const fonts = elements(firstElement(doc, 'fonts') ?? doc, 'font').map((font) => {
    const size = Number.parseFloat(firstElement(font, 'sz')?.getAttribute('val') ?? '11')
    return {
      bold: !!firstElement(font, 'b') && firstElement(font, 'b')!.getAttribute('val') !== '0',
      italic: !!firstElement(font, 'i') && firstElement(font, 'i')!.getAttribute('val') !== '0',
      fontPx: (Number.isFinite(size) ? Math.min(Math.max(size, 6), 40) : 11) * (96 / 72),
      color: resolveColor(firstElement(font, 'color'), palette),
    }
  })
  const fills = elements(firstElement(doc, 'fills') ?? doc, 'fill').map((fill) => {
    const pattern = firstElement(fill, 'patternFill')
    return pattern?.getAttribute('patternType') === 'solid' ? resolveColor(firstElement(pattern, 'fgColor'), palette) : null
  })
  const cellXfs = firstElement(doc, 'cellXfs')
  for (const xf of cellXfs ? elements(cellXfs, 'xf') : []) {
    const font = fonts[Number.parseInt(xf.getAttribute('fontId') ?? '0', 10)]
    const alignment = firstElement(xf, 'alignment')
    result.xfs.push({
      bold: font?.bold ?? false,
      italic: font?.italic ?? false,
      fontPx: font?.fontPx ?? DEFAULT_STYLE.fontPx,
      color: font?.color ?? null,
      fill: fills[Number.parseInt(xf.getAttribute('fillId') ?? '0', 10)] ?? null,
      numFmtId: Number.parseInt(xf.getAttribute('numFmtId') ?? '0', 10),
      align: alignment?.getAttribute('horizontal') ?? null,
    })
  }
  return result
}

// ---------------------------------------------------------------------------------------------------- formato numérico

const BUILTIN_DECIMALS: Record<number, { decimals: number, thousands?: boolean, percent?: boolean }> = {
  1: { decimals: 0 },
  2: { decimals: 2 },
  3: { decimals: 0, thousands: true },
  4: { decimals: 2, thousands: true },
  9: { decimals: 0, percent: true },
  10: { decimals: 2, percent: true },
  37: { decimals: 0, thousands: true },
  38: { decimals: 0, thousands: true },
  39: { decimals: 2, thousands: true },
  40: { decimals: 2, thousands: true },
}

function isDateFormat(numFmtId: number, code: string | undefined): boolean {
  if ((numFmtId >= 14 && numFmtId <= 22) || (numFmtId >= 27 && numFmtId <= 36) || (numFmtId >= 45 && numFmtId <= 47) || (numFmtId >= 50 && numFmtId <= 58)) {
    return true
  }
  if (!code) {
    return false
  }
  const stripped = code.replace(/"[^"]*"|\\.|\[[^\]]*\]|_.|\*./g, '')
  return /[ymdhs]/i.test(stripped) && !/general/i.test(stripped)
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function formatDate(serial: number, code: string | undefined): string {
  const date = new Date(Math.round((serial - 25569) * 86400000))
  if (Number.isNaN(date.getTime())) {
    return String(serial)
  }
  const stripped = (code ?? '').replace(/"[^"]*"|\\.|\[[^\]]*\]/g, '')
  const hasDate = !code || /[ymd]/i.test(stripped)
  const hasTime = /[hs]/i.test(stripped) || /:/.test(stripped)
  const datePart = `${pad2(date.getUTCDate())}/${pad2(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`
  const timePart = `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}`
  if (hasDate && hasTime && Math.abs(serial) >= 1) {
    return `${datePart} ${timePart}`
  }
  return hasDate ? datePart : timePart
}

function decimalsOf(code: string): number {
  const first = code.split(';')[0]!.replace(/"[^"]*"|\[[^\]]*\]|\\./g, '')
  const match = /\.([0#?]+)/.exec(first)
  return match ? match[1]!.length : 0
}

function formatNumber(raw: string, style: CellStyle, formats: Map<number, string>): string {
  const value = Number.parseFloat(raw)
  if (!Number.isFinite(value)) {
    return raw
  }
  const code = formats.get(style.numFmtId)
  if (isDateFormat(style.numFmtId, code)) {
    return formatDate(value, code)
  }
  const builtin = BUILTIN_DECIMALS[style.numFmtId]
  if (builtin || (code && !/^general$/i.test(code))) {
    const formatCode = code ?? ''
    const decimals = builtin ? builtin.decimals : decimalsOf(formatCode)
    const percent = builtin ? !!builtin.percent : formatCode.includes('%')
    const thousands = builtin ? !!builtin.thousands : /[#0],[#0]/.test(formatCode)
    if (/E[+-]0/i.test(formatCode)) {
      return value.toExponential(decimals).toUpperCase()
    }
    const shown = percent ? value * 100 : value
    let text = thousands
      ? shown.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      : shown.toFixed(decimals)
    if (percent) {
      text += '%'
    }
    if (/\$/.test(formatCode.replace(/"[^"]*"/g, '')) && !percent) {
      text = `$${text}`
    }
    return text
  }
  return String(Number.parseFloat(value.toPrecision(10)))
}

// ------------------------------------------------------------------------------------------------------ lectura hoja

interface RawCell {
  col: number
  row: number
  type: string | null
  style: number
  value: string
  inline: string | null
}

async function locateFirstSheet(zip: ZipLike): Promise<string> {
  const workbookXml = await readPart(zip, 'xl/workbook.xml')
  const relsXml = await readPart(zip, 'xl/_rels/workbook.xml.rels')
  if (workbookXml && relsXml) {
    const sheet = elements(parseXml(workbookXml), 'sheet').find(item => !['hidden', 'veryHidden'].includes(item.getAttribute('state') ?? ''))
    const relId = sheet?.getAttributeNS(NS_REL, 'id') ?? sheet?.getAttribute('r:id')
    const rel = relId ? elements(parseXml(relsXml), 'Relationship').find(item => item.getAttribute('Id') === relId) : null
    const target = rel?.getAttribute('Target')
    if (target) {
      return target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`
    }
  }
  return 'xl/worksheets/sheet1.xml'
}

/** Cadenas compartidas que hacen falta (por índice), sin decodificar las demás. */
async function readSharedStrings(zip: ZipLike, needed: Set<number>): Promise<Map<number, string>> {
  const result = new Map<number, string>()
  if (!needed.size) {
    return result
  }
  const xml = await readPart(zip, 'xl/sharedStrings.xml')
  if (!xml) {
    return result
  }
  const pattern = /<si(?:\s[^>]*)?>([\s\S]*?)<\/si>|<si\s*\/>/g
  let index = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(xml)) && result.size < needed.size) {
    if (needed.has(index)) {
      const body = (match[1] ?? '').replace(/<rPh[\s\S]*?<\/rPh>/g, '')
      const parts = [...body.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(part => decodeEntities(part[1]!))
      result.set(index, parts.join(''))
    }
    index++
  }
  return result
}

interface SheetInfo {
  cells: RawCell[]
  rowHeights: Map<number, number>
  hiddenRows: Set<number>
  columns: { min: number, max: number, px: number, hidden: boolean }[]
  defaultColumnPx: number
  defaultRowPx: number
  merges: { c1: number, r1: number, c2: number, r2: number }[]
}

function readSheet(xml: string): SheetInfo {
  // Combinadas (están después de sheetData, antes de cortar el XML).
  const merges: SheetInfo['merges'] = []
  for (const match of xml.matchAll(/<mergeCell\s[^>]*ref="([A-Z]+\d+):([A-Z]+\d+)"/g)) {
    const a = parseRef(match[1]!)
    const b = parseRef(match[2]!)
    if (a && b) {
      merges.push({ c1: a.col, r1: a.row, c2: b.col, r2: b.row })
    }
  }

  // Solo las primeras filas: se corta el XML en la fila SCAN_ROWS + 1.
  let cut = -1
  let from = xml.indexOf('<sheetData')
  for (let i = 0; i <= SCAN_ROWS && from !== -1; i++) {
    from = xml.indexOf('<row', from + 1)
    if (i === SCAN_ROWS && from !== -1) {
      cut = from
    }
  }
  const head = cut === -1 ? xml : `${xml.slice(0, cut)}</sheetData></worksheet>`
  const doc = parseXml(head)

  const format = firstElement(doc, 'sheetFormatPr')
  const defaultColumnPx = Number.parseFloat(format?.getAttribute('defaultColWidth') ?? '') * 7 || DEFAULT_COLUMN_PX
  const defaultRowPx = Number.parseFloat(format?.getAttribute('defaultRowHeight') ?? '') * (96 / 72) || DEFAULT_ROW_PX

  const columns = elements(doc, 'col').map(col => ({
    min: Number.parseInt(col.getAttribute('min') ?? '1', 10) - 1,
    max: Number.parseInt(col.getAttribute('max') ?? '1', 10) - 1,
    px: (Number.parseFloat(col.getAttribute('width') ?? '') * 7) || defaultColumnPx,
    hidden: col.getAttribute('hidden') === '1' || col.getAttribute('hidden') === 'true',
  }))

  const cells: RawCell[] = []
  const rowHeights = new Map<number, number>()
  const hiddenRows = new Set<number>()
  let implicitRow = 0
  for (const rowNode of elements(doc, 'row')) {
    const rowNumber = Number.parseInt(rowNode.getAttribute('r') ?? '', 10) || implicitRow + 1
    implicitRow = rowNumber
    if (rowNode.getAttribute('hidden') === '1' || rowNode.getAttribute('hidden') === 'true') {
      hiddenRows.add(rowNumber)
    }
    const height = Number.parseFloat(rowNode.getAttribute('ht') ?? '')
    if (Number.isFinite(height) && height > 0) {
      rowHeights.set(rowNumber, height * (96 / 72))
    }
    let implicitCol = -1
    for (const cell of Array.from(rowNode.children)) {
      if (cell.localName !== 'c') {
        continue
      }
      const ref = parseRef(cell.getAttribute('r') ?? '')
      const col = ref?.col ?? implicitCol + 1
      implicitCol = col
      const inlineNode = firstElement(cell, 'is')
      cells.push({
        col,
        row: rowNumber,
        type: cell.getAttribute('t'),
        style: Number.parseInt(cell.getAttribute('s') ?? '0', 10) || 0,
        value: firstElement(cell, 'v')?.textContent ?? '',
        inline: inlineNode ? elements(inlineNode, 't').filter(t => t.parentElement?.localName !== 'rPh').map(t => t.textContent ?? '').join('') : null,
      })
    }
  }
  return { cells, rowHeights, hiddenRows, columns, defaultColumnPx, defaultRowPx, merges }
}

// ------------------------------------------------------------------------------------------------------------ dibujo

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/png'))
}

function fontFor(style: CellStyle): string {
  return `${style.italic ? 'italic ' : ''}${style.bold ? 'bold ' : ''}${style.fontPx}px ${FONT_FAMILY}`
}

async function buildThumbnail(file: File, width: number): Promise<Blob | null> {
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(file) as unknown as ZipLike

  const sheetXml = await readPart(zip, await locateFirstSheet(zip))
  if (!sheetXml) {
    return null
  }
  const sheet = readSheet(sheetXml)
  if (!sheet.cells.length) {
    return null
  }

  const palette = parseThemePalette(await readPart(zip, 'xl/theme/theme1.xml'))
  const styles = parseStyles(await readPart(zip, 'xl/styles.xml'), palette)
  const sharedNeeded = new Set<number>()
  for (const cell of sheet.cells) {
    if (cell.type === 's') {
      const index = Number.parseInt(cell.value, 10)
      if (Number.isFinite(index)) {
        sharedNeeded.add(index)
      }
    }
  }
  const shared = await readSharedStrings(zip, sharedNeeded)

  // Celdas con valor visible (las que solo tienen estilo no cuentan para ubicar los datos).
  const data = new Map<string, CellData>()
  const styled = new Map<string, CellStyle>()
  let minCol = Infinity
  let minRow = Infinity
  let maxCol = -1
  let maxRow = -1
  for (const raw of sheet.cells) {
    const style = styles.xfs[raw.style] ?? DEFAULT_STYLE
    const key = `${raw.row}:${raw.col}`
    let text = ''
    let kind: CellData['kind'] = 'text'
    let general: number | undefined
    switch (raw.type) {
      case 's': text = shared.get(Number.parseInt(raw.value, 10)) ?? ''; break
      case 'inlineStr': text = raw.inline ?? ''; break
      case 'str': text = raw.value; break
      case 'b': text = raw.value === '1' ? 'TRUE' : 'FALSE'; kind = 'bool'; break
      case 'e': text = raw.value; kind = 'error'; break
      case 'd': text = raw.value.slice(0, 10); break
      default:
        if (raw.value !== '') {
          text = formatNumber(raw.value, style, styles.customFormats)
          kind = 'number'
          if (text === String(Number.parseFloat(Number.parseFloat(raw.value).toPrecision(10)))) {
            general = Number.parseFloat(raw.value)
          }
        }
    }
    if (text !== '') {
      data.set(key, { text: text.replace(/\s+/g, ' ').trim(), kind, style, general })
      minCol = Math.min(minCol, raw.col)
      minRow = Math.min(minRow, raw.row)
      maxCol = Math.max(maxCol, raw.col)
      maxRow = Math.max(maxRow, raw.row)
    }
    else if (style.fill) {
      styled.set(key, style)
    }
  }
  if (!data.size) {
    return null
  }

  const columnWidth = (col: number): number => {
    const found = sheet.columns.find(c => col >= c.min && col <= c.max)
    return found ? (found.hidden ? 0 : found.px) : sheet.defaultColumnPx
  }

  const columns: { index: number, px: number, x: number }[] = []
  let naturalWidth = 0
  for (let col = minCol; col <= maxCol && columns.length < MAX_COLUMNS; col++) {
    const px = columnWidth(col)
    if (px <= 0) {
      continue
    }
    if (columns.length && naturalWidth + px > MAX_NATURAL_WIDTH) {
      break
    }
    columns.push({ index: col, px, x: naturalWidth })
    naturalWidth += px
  }
  if (!columns.length) {
    return null
  }

  const scale = Math.min(2, width / naturalWidth)
  const maxHeight = width * 0.9

  const rows: { index: number, px: number, y: number }[] = []
  let naturalHeight = 0
  for (let row = minRow; row <= maxRow && rows.length < MAX_ROWS; row++) {
    if (sheet.hiddenRows.has(row)) {
      continue
    }
    let px = sheet.rowHeights.get(row) ?? sheet.defaultRowPx
    if (!sheet.rowHeights.has(row)) {
      for (const column of columns) {
        const cell = data.get(`${row}:${column.index}`)
        if (cell) {
          px = Math.max(px, cell.style.fontPx * 1.4)
        }
      }
    }
    if (rows.length && (naturalHeight + px) * scale > maxHeight) {
      break
    }
    rows.push({ index: row, px, y: naturalHeight })
    naturalHeight += px
  }

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(naturalHeight * scale))
  const context = canvas.getContext('2d')
  if (!context) {
    return null
  }
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.scale(scale, scale)

  const columnPos = new Map(columns.map(c => [c.index, c]))
  const rowPos = new Map(rows.map(r => [r.index, r]))
  // Combinadas: la celda superior izquierda abarca el resto (solo lo que cae dentro de lo mostrado).
  const mergeAt = new Map<string, { span: number, inner: Set<string> }>()
  const mergedInner = new Set<string>()
  for (const merge of sheet.merges) {
    const cols = columns.filter(c => c.index >= merge.c1 && c.index <= merge.c2)
    const merged = rows.filter(r => r.index >= merge.r1 && r.index <= merge.r2)
    if (!cols.length || !merged.length || !columnPos.has(merge.c1) || !rowPos.has(merge.r1)) {
      continue
    }
    mergeAt.set(`${merge.r1}:${merge.c1}`, { span: cols.reduce((sum, c) => sum + c.px, 0), inner: new Set() })
    for (const r of merged) {
      for (const c of cols) {
        if (r.index !== merge.r1 || c.index !== merge.c1) {
          mergedInner.add(`${r.index}:${c.index}`)
        }
      }
    }
  }

  // Rellenos
  for (const row of rows) {
    for (const column of columns) {
      const key = `${row.index}:${column.index}`
      const fill = (data.get(key)?.style ?? styled.get(key))?.fill
      if (fill) {
        context.fillStyle = fill
        context.fillRect(column.x, row.y, column.px, row.px)
      }
    }
  }

  // Cuadrícula
  context.strokeStyle = '#d4d4d4'
  context.lineWidth = 1 / scale
  context.beginPath()
  for (const row of rows) {
    context.moveTo(0, row.y + row.px)
    context.lineTo(naturalWidth, row.y + row.px)
  }
  context.moveTo(0, 0)
  context.lineTo(naturalWidth, 0)
  for (const column of columns) {
    context.moveTo(column.x + column.px, 0)
    context.lineTo(column.x + column.px, naturalHeight)
  }
  context.moveTo(0, 0)
  context.lineTo(0, naturalHeight)
  context.stroke()

  // Texto
  context.textBaseline = 'middle'
  for (const row of rows) {
    for (const column of columns) {
      const key = `${row.index}:${column.index}`
      const cell = data.get(key)
      if (!cell || mergedInner.has(key)) {
        continue
      }
      let cellWidth = mergeAt.get(key)?.span ?? column.px
      const align = cell.style.align && cell.style.align !== 'general'
        ? cell.style.align
        : cell.kind === 'number' ? 'right' : cell.kind === 'text' ? 'left' : 'center'
      // Un texto a la izquierda se desborda sobre las celdas vacías de su derecha, como en Excel.
      if (align === 'left' && !mergeAt.has(key)) {
        for (let next = column.index + 1; columnPos.has(next); next++) {
          const nextKey = `${row.index}:${next}`
          if (data.has(nextKey)) {
            break
          }
          cellWidth += columnPos.get(next)!.px
        }
      }
      context.save()
      context.beginPath()
      context.rect(column.x, row.y, cellWidth, row.px)
      context.clip()
      context.font = fontFor(cell.style)
      let shown = cell.text
      if (cell.general !== undefined && context.measureText(shown).width > cellWidth - 6) {
        // Número General que no cabe: menos decimales hasta que quepa (Excel hace lo mismo).
        for (let decimals = 8; decimals >= 0; decimals--) {
          shown = String(Number.parseFloat(cell.general.toFixed(decimals)))
          if (context.measureText(shown).width <= cellWidth - 6) {
            break
          }
        }
      }
      context.fillStyle = cell.style.color ?? (cell.kind === 'error' ? '#c00000' : '#000000')
      const pad = 3
      let x = column.x + pad
      if (align === 'right') {
        context.textAlign = 'right'
        x = column.x + cellWidth - pad
      }
      else if (align === 'center' || align === 'centerContinuous') {
        context.textAlign = 'center'
        x = column.x + cellWidth / 2
      }
      else {
        context.textAlign = 'left'
      }
      context.fillText(shown, x, row.y + row.px / 2 + 0.5)
      context.restore()
    }
  }

  return canvasToPng(canvas)
}

/**
 * PNG (de `width` px de ancho) con la primera hoja del libro, o `null` si no se pudo (archivo dañado o protegido, hoja
 * vacía, demasiado grande). Nunca lanza.
 */
export async function renderSpreadsheetThumbnail(file: File, width: number): Promise<Blob | null> {
  try {
    if (typeof document === 'undefined' || file.size > MAX_FILE_BYTES || width < 16) {
      return null
    }
    return await buildThumbnail(file, width)
  }
  catch {
    return null
  }
}
