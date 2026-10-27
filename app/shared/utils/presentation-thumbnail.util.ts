/**
 * Miniatura APROXIMADA de la primera diapositiva de un .pptx/.pptm/.ppsx/.potx que NO trae vista previa embebida.
 *
 * No existe un renderizador fiel y ligero de PowerPoint para el navegador; esto lee el OOXML con JSZip (ya es
 * dependencia del proyecto) y pinta directo en un canvas 2D la diapositiva 1: fondo (color, degradado o imagen, con
 * herencia diapositiva -> plantilla (layout) -> patrón (master)), formas del patrón/plantilla, y en la diapositiva
 * rectángulos/elipses/etc. con relleno y borde, imágenes (con recorte), grupos, líneas, tablas sencillas y textos con
 * herencia de estilos (tamaño, negrita, color del tema, viñetas, alineación, ajuste de línea y autoajuste).
 *
 * Limitaciones (es una aproximación, no PowerPoint): sin SmartArt ni gráficas (se dibuja un recuadro), sin formas
 * personalizadas (custGeom) ni la mayoría de formas predefinidas (todas se dibujan como rectángulo salvo roundRect,
 * ellipse, triangle y diamond), sin efectos (sombras, reflejos, 3D), sin texto vertical/WordArt, sin imágenes
 * .emf/.wmf/.svg, fuentes sustituidas si el equipo no las tiene, sin estilos de tabla reales (se aproxima el estándar).
 * Se descartaron `pptx-preview` (~1.7 MB + echarts + lodash, genera HTML que luego habría que rasterizar con
 * html2canvas, que no es fiel con sus capas absolutas) y las demás librerías de HTML por el mismo motivo.
 *
 * Nunca lanza: ante cualquier fallo devuelve `null` y el chip normal sigue funcionando.
 */

const MAX_FILE_BYTES = 50 * 1024 * 1024
const MAX_PART_BYTES = 40 * 1024 * 1024
const MAX_MEDIA_BYTES = 12 * 1024 * 1024
const MAX_SHAPES = 400
const RENDER_BUDGET_MS = 8500
const FALLBACK_FONTS = 'Calibri, "Segoe UI", Arial, Helvetica, sans-serif'
const EMU_PER_PT = 12700
const DEFAULT_SLIDE = { cx: 9144000, cy: 6858000 }

type ZipFile = { async: (type: 'string' | 'blob') => Promise<any> }
type ZipLike = { file: (name: string) => ZipFile | null }

interface Part {
  path: string
  doc: Document
  /** Id de relación -> ruta absoluta dentro del zip. */
  rels: Map<string, { path: string, type: string }>
}

interface Matrix { sx: number, sy: number, tx: number, ty: number }

interface Rect { x: number, y: number, w: number, h: number }

interface Deck {
  zip: ZipLike
  ctx: CanvasRenderingContext2D
  /** px por EMU. */
  scale: number
  width: number
  height: number
  colors: Record<string, string>
  clrMap: Record<string, string>
  majorFont: string
  minorFont: string
  theme: Document | null
  defaultTextStyle: Element | null
  masterTxStyles: Element | null
  slide: Part
  layout: Part | null
  master: Part | null
  bitmaps: Map<string, ImageBitmap | null>
  shapes: number
  drawn: number
  deadline: number
}

type Fill = { type: 'style', value: string | CanvasGradient } | { type: 'image', bitmap: ImageBitmap, src: Element | null } | { type: 'none' } | null

// ---------------------------------------------------------------------------------------------------- XML / utilidades

function parseXml(text: string): Document {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) {
    throw new Error('XML inválido')
  }
  return doc
}

function child(parent: Element | Document | null | undefined, name: string): Element | null {
  if (!parent) {
    return null
  }
  for (const node of Array.from((parent as Element).children ?? [])) {
    if (node.localName === name) {
      return node
    }
  }
  return null
}

function childrenOf(parent: Element | null | undefined, name?: string): Element[] {
  return parent ? Array.from(parent.children).filter(node => !name || node.localName === name) : []
}

function descendant(parent: Element | Document | null | undefined, name: string): Element | null {
  return parent ? parent.getElementsByTagNameNS('*', name)[0] ?? null : null
}

function attrNum(el: Element | null | undefined, name: string): number | null {
  const raw = el?.getAttribute(name)
  if (raw == null || raw === '') {
    return null
  }
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

function first<T>(...values: (T | null | undefined)[]): T | null {
  for (const value of values) {
    if (value != null) {
      return value
    }
  }
  return null
}

function resolvePath(basePath: string, target: string): string {
  if (target.startsWith('/')) {
    return target.slice(1)
  }
  const parts = basePath.split('/').slice(0, -1)
  for (const segment of target.split('/')) {
    if (segment === '..') {
      parts.pop()
    }
    else if (segment !== '.' && segment !== '') {
      parts.push(segment)
    }
  }
  return parts.join('/')
}

async function readEntry(zip: ZipLike, path: string, type: 'string' | 'blob', maxBytes: number): Promise<any | null> {
  const entry = zip.file(path)
  if (!entry) {
    return null
  }
  const size = (entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize
  if (typeof size === 'number' && size > maxBytes) {
    return null
  }
  return entry.async(type)
}

async function loadPart(zip: ZipLike, path: string): Promise<Part | null> {
  const xml = await readEntry(zip, path, 'string', MAX_PART_BYTES)
  if (xml == null) {
    return null
  }
  const doc = parseXml(xml)
  const slash = path.lastIndexOf('/')
  const relsPath = `${path.slice(0, slash + 1)}_rels/${path.slice(slash + 1)}.rels`
  const rels = new Map<string, { path: string, type: string }>()
  const relsXml = await readEntry(zip, relsPath, 'string', MAX_PART_BYTES)
  if (relsXml != null) {
    for (const rel of Array.from(parseXml(relsXml).getElementsByTagNameNS('*', 'Relationship'))) {
      const id = rel.getAttribute('Id')
      const target = rel.getAttribute('Target')
      if (id && target && rel.getAttribute('TargetMode') !== 'External') {
        rels.set(id, { path: resolvePath(path, target), type: rel.getAttribute('Type') ?? '' })
      }
    }
  }
  return { path, doc, rels }
}

function relOfType(part: Part | null, suffix: string): string | null {
  if (!part) {
    return null
  }
  for (const rel of part.rels.values()) {
    if (rel.type.endsWith(suffix)) {
      return rel.path
    }
  }
  return null
}

function checkBudget(deck: Deck): void {
  if (performance.now() > deck.deadline) {
    throw new Error('Presupuesto de tiempo agotado')
  }
}

// -------------------------------------------------------------------------------------------------------------- color

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '')
  return [0, 2, 4].map(i => Number.parseInt(value.slice(i, i + 2), 16) || 0) as [number, number, number]
}

function rgbToHsl([r0, g0, b0]: [number, number, number]): [number, number, number] {
  const r = r0 / 255
  const g = g0 / 255
  const b = b0 / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
    h /= 6
  }
  return [h, s, l]
}

function hslToRgb([h, s, l]: [number, number, number]): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255)
    return [v, v, v]
  }
  const hue = (p: number, q: number, t0: number) => {
    const t = t0 < 0 ? t0 + 1 : t0 > 1 ? t0 - 1 : t0
    if (t < 1 / 6) {
      return p + (q - p) * 6 * t
    }
    if (t < 1 / 2) {
      return q
    }
    if (t < 2 / 3) {
      return p + (q - p) * (2 / 3 - t) * 6
    }
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return [hue(p, q, h + 1 / 3), hue(p, q, h), hue(p, q, h - 1 / 3)].map(v => Math.round(Math.min(1, Math.max(0, v)) * 255)) as [number, number, number]
}

const PRESET_COLORS: Record<string, string> = {
  black: '000000', white: 'FFFFFF', red: 'FF0000', green: '008000', blue: '0000FF', yellow: 'FFFF00', gray: '808080',
  grey: '808080', orange: 'FFA500', purple: '800080', silver: 'C0C0C0', navy: '000080', teal: '008080',
}

/** Resuelve un nodo de color DrawingML (`srgbClr`, `schemeClr`, `sysClr`, `prstClr`) con sus transformaciones. */
function colorFrom(deck: Deck, holder: Element | null | undefined, placeholderColor?: string | null): string | null {
  const node = holder ? childrenOf(holder).find(item => ['srgbClr', 'schemeClr', 'sysClr', 'prstClr'].includes(item.localName)) : null
  if (!node) {
    return null
  }
  let hex: string | null = null
  switch (node.localName) {
    case 'srgbClr':
      hex = node.getAttribute('val')
      break
    case 'sysClr':
      hex = node.getAttribute('lastClr') ?? (node.getAttribute('val') === 'window' ? 'FFFFFF' : '000000')
      break
    case 'prstClr':
      hex = PRESET_COLORS[node.getAttribute('val') ?? ''] ?? '000000'
      break
    default: {
      const name = node.getAttribute('val') ?? ''
      if (name === 'phClr') {
        hex = placeholderColor ? placeholderColor.replace('#', '').slice(0, 6) : null
      }
      else {
        hex = deck.colors[deck.clrMap[name] ?? name] ?? null
      }
    }
  }
  if (!hex || !/^[0-9a-f]{6}$/i.test(hex)) {
    return null
  }
  let rgb = hexToRgb(hex)
  let alpha = 1
  for (const modifier of childrenOf(node)) {
    const value = (attrNum(modifier, 'val') ?? 100000) / 100000
    switch (modifier.localName) {
      case 'lumMod': {
        const hsl = rgbToHsl(rgb)
        rgb = hslToRgb([hsl[0], hsl[1], Math.min(1, hsl[2] * value)])
        break
      }
      case 'lumOff': {
        const hsl = rgbToHsl(rgb)
        rgb = hslToRgb([hsl[0], hsl[1], Math.min(1, Math.max(0, hsl[2] + value))])
        break
      }
      case 'tint':
        rgb = rgb.map(v => Math.round(v * value + 255 * (1 - value))) as [number, number, number]
        break
      case 'shade':
        rgb = rgb.map(v => Math.round(v * value)) as [number, number, number]
        break
      case 'alpha':
        alpha = value
        break
    }
  }
  return alpha < 1 ? `rgba(${rgb.join(',')},${alpha})` : `#${rgb.map(v => v.toString(16).padStart(2, '0')).join('')}`
}

// ------------------------------------------------------------------------------------------------------------ imágenes

async function loadBitmap(deck: Deck, path: string): Promise<ImageBitmap | null> {
  if (deck.bitmaps.has(path)) {
    return deck.bitmaps.get(path) ?? null
  }
  let bitmap: ImageBitmap | null = null
  try {
    const blob = await readEntry(deck.zip, path, 'blob', MAX_MEDIA_BYTES)
    if (blob && /\.(png|jpe?g|gif|webp|bmp)$/i.test(path)) {
      const typed = blob.type ? blob : new Blob([blob], { type: /\.png$/i.test(path) ? 'image/png' : /\.gif$/i.test(path) ? 'image/gif' : 'image/jpeg' })
      bitmap = await createImageBitmap(typed)
    }
  }
  catch {
    bitmap = null
  }
  deck.bitmaps.set(path, bitmap)
  return bitmap
}

async function blipOf(deck: Deck, part: Part, blipFill: Element | null): Promise<{ bitmap: ImageBitmap, src: Element | null } | null> {
  const blip = child(blipFill, 'blip')
  const id = blip?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed') ?? blip?.getAttribute('r:embed')
  const path = id ? part.rels.get(id)?.path : null
  const bitmap = path ? await loadBitmap(deck, path) : null
  return bitmap ? { bitmap, src: child(blipFill, 'srcRect') } : null
}

function drawBitmap(deck: Deck, bitmap: ImageBitmap, src: Element | null, rect: Rect): void {
  const l = (attrNum(src, 'l') ?? 0) / 100000
  const t = (attrNum(src, 't') ?? 0) / 100000
  const r = (attrNum(src, 'r') ?? 0) / 100000
  const b = (attrNum(src, 'b') ?? 0) / 100000
  const sx = bitmap.width * l
  const sy = bitmap.height * t
  const sw = Math.max(1, bitmap.width * (1 - l - r))
  const sh = Math.max(1, bitmap.height * (1 - t - b))
  deck.ctx.drawImage(bitmap, sx, sy, sw, sh, rect.x, rect.y, rect.w, rect.h)
}

// ------------------------------------------------------------------------------------------------------------ rellenos

function themeStyleEntry(deck: Deck, listName: string, index: number): Element | null {
  const list = deck.theme ? descendant(deck.theme, listName) : null
  return childrenOf(list)[index] ?? null
}

/** Relleno declarado dentro de `holder` (spPr, bgPr, entrada del tema…). `null`: no declara ninguno. */
async function fillOf(deck: Deck, part: Part, holder: Element | null, rect: Rect, placeholderColor?: string | null): Promise<Fill> {
  const node = holder ? childrenOf(holder).find(item => ['noFill', 'solidFill', 'gradFill', 'blipFill', 'pattFill'].includes(item.localName)) : null
  if (!node) {
    return null
  }
  switch (node.localName) {
    case 'noFill':
      return { type: 'none' }
    case 'solidFill': {
      const color = colorFrom(deck, node, placeholderColor)
      return color ? { type: 'style', value: color } : null
    }
    case 'pattFill': {
      const color = colorFrom(deck, child(node, 'fgClr'), placeholderColor)
      return color ? { type: 'style', value: color } : null
    }
    case 'gradFill': {
      const stops = childrenOf(child(node, 'gsLst'), 'gs')
        .map(stop => ({ pos: (attrNum(stop, 'pos') ?? 0) / 100000, color: colorFrom(deck, stop, placeholderColor) }))
        .filter((stop): stop is { pos: number, color: string } => !!stop.color)
      if (!stops.length) {
        return null
      }
      const linear = child(node, 'lin')
      let gradient: CanvasGradient
      if (child(node, 'path')) {
        gradient = deck.ctx.createRadialGradient(rect.x + rect.w / 2, rect.y + rect.h / 2, 0, rect.x + rect.w / 2, rect.y + rect.h / 2, Math.max(rect.w, rect.h) / 2)
      }
      else {
        const angle = ((attrNum(linear, 'ang') ?? 0) / 60000) * Math.PI / 180
        const dx = Math.cos(angle)
        const dy = Math.sin(angle)
        const half = (Math.abs(rect.w * dx) + Math.abs(rect.h * dy)) / 2
        const cx = rect.x + rect.w / 2
        const cy = rect.y + rect.h / 2
        gradient = deck.ctx.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half)
      }
      for (const stop of stops) {
        gradient.addColorStop(Math.min(1, Math.max(0, stop.pos)), stop.color)
      }
      return { type: 'style', value: gradient }
    }
    default: {
      const blip = await blipOf(deck, part, node)
      return blip ? { type: 'image', bitmap: blip.bitmap, src: blip.src } : null
    }
  }
}

function paintFill(deck: Deck, fill: Fill, rect: Rect, tracePath?: () => void): boolean {
  if (!fill || fill.type === 'none') {
    return false
  }
  const { ctx } = deck
  if (fill.type === 'style') {
    ctx.fillStyle = fill.value
    if (tracePath) {
      ctx.beginPath()
      tracePath()
      ctx.fill()
    }
    else {
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
    }
    return true
  }
  ctx.save()
  if (tracePath) {
    ctx.beginPath()
    tracePath()
    ctx.clip()
  }
  drawBitmap(deck, fill.bitmap, fill.src, rect)
  ctx.restore()
  return true
}

/** Fondo de la diapositiva con herencia diapositiva -> plantilla -> patrón. Devuelve si hubo un fondo explícito. */
async function paintBackground(deck: Deck): Promise<boolean> {
  const full: Rect = { x: 0, y: 0, w: deck.width, h: deck.height }
  deck.ctx.fillStyle = '#ffffff'
  deck.ctx.fillRect(0, 0, deck.width, deck.height)
  for (const part of [deck.slide, deck.layout, deck.master]) {
    const bg = part ? child(child(part.doc.documentElement, 'cSld'), 'bg') : null
    if (!bg) {
      continue
    }
    const properties = child(bg, 'bgPr')
    let fill: Fill = null
    if (properties) {
      fill = await fillOf(deck, part!, properties, full)
    }
    else {
      const reference = child(bg, 'bgRef')
      const index = attrNum(reference, 'idx') ?? 0
      const color = colorFrom(deck, reference)
      if (reference && index >= 1001) {
        fill = await fillOf(deck, part!, themeStyleEntry(deck, 'bgFillStyleLst', index - 1001) ? wrapSingle(themeStyleEntry(deck, 'bgFillStyleLst', index - 1001)!) : null, full, color)
      }
      if (!fill && color) {
        fill = { type: 'style', value: color }
      }
    }
    if (fill) {
      return paintFill(deck, fill, full)
    }
  }
  return false
}

/** Las entradas del tema son el propio nodo de relleno; `fillOf` espera un contenedor: se envuelve. */
function wrapSingle(node: Element): Element {
  const holder = node.ownerDocument.createElementNS(node.namespaceURI, 'holder')
  holder.appendChild(node.cloneNode(true))
  return holder
}

// ------------------------------------------------------------------------------------------------------------ geometría

interface Xfrm { x: number, y: number, cx: number, cy: number, rot: number, flipH: boolean, flipV: boolean }

function readXfrm(holder: Element | null): Xfrm | null {
  const xfrm = child(holder, 'xfrm')
  const off = child(xfrm, 'off')
  const ext = child(xfrm, 'ext')
  if (!xfrm || !off || !ext) {
    return null
  }
  return {
    x: attrNum(off, 'x') ?? 0,
    y: attrNum(off, 'y') ?? 0,
    cx: attrNum(ext, 'cx') ?? 0,
    cy: attrNum(ext, 'cy') ?? 0,
    rot: (attrNum(xfrm, 'rot') ?? 0) / 60000,
    flipH: xfrm.getAttribute('flipH') === '1' || xfrm.getAttribute('flipH') === 'true',
    flipV: xfrm.getAttribute('flipV') === '1' || xfrm.getAttribute('flipV') === 'true',
  }
}

function toRect(deck: Deck, matrix: Matrix, xfrm: Xfrm): Rect {
  return {
    x: (matrix.tx + matrix.sx * xfrm.x) * deck.scale,
    y: (matrix.ty + matrix.sy * xfrm.y) * deck.scale,
    w: matrix.sx * xfrm.cx * deck.scale,
    h: matrix.sy * xfrm.cy * deck.scale,
  }
}

function applyOrientation(deck: Deck, rect: Rect, xfrm: Xfrm): void {
  if (!xfrm.rot && !xfrm.flipH && !xfrm.flipV) {
    return
  }
  const cx = rect.x + rect.w / 2
  const cy = rect.y + rect.h / 2
  deck.ctx.translate(cx, cy)
  if (xfrm.rot) {
    deck.ctx.rotate(xfrm.rot * Math.PI / 180)
  }
  deck.ctx.scale(xfrm.flipH ? -1 : 1, xfrm.flipV ? -1 : 1)
  deck.ctx.translate(-cx, -cy)
}

function geometryPath(deck: Deck, preset: string, adjust: number | null, rect: Rect): () => void {
  const { ctx } = deck
  const { x, y, w, h } = rect
  switch (preset) {
    case 'roundRect':
      return () => {
        const r = Math.min(w, h) * Math.min(0.5, (adjust ?? 16667) / 100000)
        ctx.roundRect(x, y, w, h, r)
      }
    case 'ellipse':
    case 'oval':
      return () => ctx.ellipse(x + w / 2, y + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2)
    case 'triangle':
      return () => {
        ctx.moveTo(x + w / 2, y)
        ctx.lineTo(x + w, y + h)
        ctx.lineTo(x, y + h)
        ctx.closePath()
      }
    case 'diamond':
      return () => {
        ctx.moveTo(x + w / 2, y)
        ctx.lineTo(x + w, y + h / 2)
        ctx.lineTo(x + w / 2, y + h)
        ctx.lineTo(x, y + h / 2)
        ctx.closePath()
      }
    default:
      return () => ctx.rect(x, y, w, h)
  }
}

// ------------------------------------------------------------------------------------------------------ herencia (ph)

interface PlaceholderInfo { type: string | null, idx: string | null }

function placeholderOf(sp: Element): PlaceholderInfo | null {
  const ph = descendant(child(sp, 'nvSpPr') ?? child(sp, 'nvPicPr') ?? child(sp, 'nvGraphicFramePr'), 'ph')
  return ph ? { type: ph.getAttribute('type'), idx: ph.getAttribute('idx') } : null
}

function normalizedPhType(type: string | null): string {
  if (type === 'ctrTitle') {
    return 'title'
  }
  if (type === 'subTitle' || type === 'obj' || type == null) {
    return 'body'
  }
  return type
}

function findPlaceholder(part: Part | null, info: PlaceholderInfo): Element | null {
  const tree = part ? child(child(part.doc.documentElement, 'cSld'), 'spTree') : null
  const candidates = childrenOf(tree, 'sp').filter(sp => placeholderOf(sp))
  if (!candidates.length) {
    return null
  }
  if (info.idx != null) {
    const byIdx = candidates.find(sp => placeholderOf(sp)!.idx === info.idx)
    if (byIdx) {
      return byIdx
    }
  }
  const type = normalizedPhType(info.type)
  return candidates.find(sp => normalizedPhType(placeholderOf(sp)!.type) === type) ?? null
}

/** [forma de la diapositiva, de la plantilla, del patrón]: lo primero que declara algo gana. */
function placeholderChain(deck: Deck, sp: Element): Element[] {
  const info = placeholderOf(sp)
  if (!info) {
    return [sp]
  }
  const fromLayout = findPlaceholder(deck.layout, info)
  const layoutInfo = fromLayout ? placeholderOf(fromLayout)! : info
  const fromMaster = findPlaceholder(deck.master, { type: layoutInfo.type ?? info.type, idx: null })
  return [sp, fromLayout, fromMaster].filter((item): item is Element => !!item)
}

function styleKindOf(sp: Element): 'title' | 'body' | 'other' {
  const info = placeholderOf(sp)
  if (!info) {
    return 'other'
  }
  const type = normalizedPhType(info.type)
  return type === 'title' ? 'title' : type === 'body' ? 'body' : 'other'
}

// ---------------------------------------------------------------------------------------------------------------- texto

interface ParagraphRun { text: string, props: Element | null, newline?: boolean }

function fontFamily(deck: Deck, typeface: string | null): string {
  const name = typeface === '+mj-lt' ? deck.majorFont : typeface === '+mn-lt' || !typeface ? deck.minorFont : typeface
  return `"${name.replace(/"/g, '')}", ${FALLBACK_FONTS}`
}

const WINGDINGS_BULLETS: Record<string, string> = { '§': '▪', 'Ø': '➢', 'ü': '✓', 'v': '❖', 'q': '❑', 'l': '●', '¡': '○' }

interface DrawTextOptions {
  inset?: { l: number, t: number, r: number, b: number }
  anchor?: string
  defaultColor?: string | null
  defaultBold?: boolean
  fontScale?: number
  autofit?: boolean
  wrap?: boolean
}

function paragraphLevels(deck: Deck, chain: Element[], kind: 'title' | 'body' | 'other', level: number): Element[] {
  const name = `lvl${level + 1}pPr`
  const lists: (Element | null)[] = chain.map(sp => child(child(child(sp, 'txBody'), 'lstStyle'), name))
  const styleList = deck.masterTxStyles ? child(deck.masterTxStyles, kind === 'title' ? 'titleStyle' : kind === 'body' ? 'bodyStyle' : 'otherStyle') : null
  lists.push(child(styleList, name))
  lists.push(child(deck.defaultTextStyle, name))
  return lists.filter((item): item is Element => !!item)
}

function drawTextBody(
  deck: Deck,
  txBody: Element,
  chain: Element[],
  kind: 'title' | 'body' | 'other',
  rect: Rect,
  fontRefColor: string | null,
  options: DrawTextOptions = {},
): boolean {
  const { ctx } = deck
  const paragraphs = childrenOf(txBody, 'p')
  const hasText = paragraphs.some(p => Array.from(p.getElementsByTagNameNS('*', 't')).some(t => (t.textContent ?? '').trim()))
  if (!hasText) {
    return false
  }

  const bodyProps = [child(txBody, 'bodyPr'), ...chain.map(sp => child(child(sp, 'txBody'), 'bodyPr'))].filter((item): item is Element => !!item)
  const bodyAttr = (name: string): string | null => first(...bodyProps.map(item => item.getAttribute(name)))
  const inset = options.inset ?? {
    l: (attrNum(bodyProps.find(item => item.hasAttribute('lIns')) ?? null, 'lIns') ?? 91440) * deck.scale,
    t: (attrNum(bodyProps.find(item => item.hasAttribute('tIns')) ?? null, 'tIns') ?? 45720) * deck.scale,
    r: (attrNum(bodyProps.find(item => item.hasAttribute('rIns')) ?? null, 'rIns') ?? 91440) * deck.scale,
    b: (attrNum(bodyProps.find(item => item.hasAttribute('bIns')) ?? null, 'bIns') ?? 45720) * deck.scale,
  }
  const anchor = options.anchor ?? bodyAttr('anchor') ?? 't'
  const wrap = options.wrap ?? bodyAttr('wrap') !== 'none'
  const autofitNode = bodyProps.map(item => child(item, 'normAutofit')).find(Boolean) ?? null
  const baseScale = options.fontScale ?? ((autofitNode ? attrNum(autofitNode, 'fontScale') : null) ?? 100000) / 100000
  const canShrink = options.autofit ?? !!autofitNode

  const innerW = Math.max(1, rect.w - inset.l - inset.r)
  const innerH = Math.max(1, rect.h - inset.t - inset.b)

  interface Piece { text: string, font: string, color: string, size: number, underline: boolean, width: number, space: boolean }
  interface Line { pieces: Piece[], width: number, height: number, baseline: number, left: number, avail: number, align: string, before: number, bullet: { text: string, font: string, color: string, size: number, left: number } | null }

  const layout = (shrink: number): { lines: Line[], height: number } => {
    const lines: Line[] = []
    let counter: Record<number, number> = {}
    let previousLevel = 0
    for (const paragraph of paragraphs) {
      const pPr = child(paragraph, 'pPr')
      const level = Math.min(8, Math.max(0, attrNum(pPr, 'lvl') ?? 0))
      const levels = [pPr, ...paragraphLevels(deck, chain, kind, level)].filter((item): item is Element => !!item)
      const lvlAttr = (name: string): string | null => first(...levels.map(item => item.getAttribute(name)))
      const lvlChild = (name: string): Element | null => first(...levels.map(item => child(item, name)))
      const defaults = levels.map(item => child(item, 'defRPr')).filter((item): item is Element => !!item)

      const runs: ParagraphRun[] = []
      for (const node of childrenOf(paragraph)) {
        if (node.localName === 'r' || node.localName === 'fld') {
          runs.push({ text: child(node, 't')?.textContent ?? '', props: child(node, 'rPr') })
        }
        else if (node.localName === 'br') {
          runs.push({ text: '', props: child(node, 'rPr'), newline: true })
        }
      }

      const resolveRun = (props: Element | null) => {
        const sources = [props, ...defaults].filter((item): item is Element => !!item)
        const get = (name: string): string | null => first(...sources.map(item => item.getAttribute(name)))
        const sz = attrNum(first(...sources.map(item => (item.hasAttribute('sz') ? item : null))), 'sz') ?? 1800
        const sizePx = (sz / 100) * EMU_PER_PT * deck.scale * baseScale * shrink
        const typeface = first(...sources.map(item => child(item, 'latin')?.getAttribute('typeface') ?? null))
        const defaultText = deck.colors[deck.clrMap.tx1 ?? 'dk1']
        // Prioridad: color del propio run, color de la tabla/forma (fontRef), y al final el de los estilos de lista.
        const ownColor = props ? colorFrom(deck, child(props, 'solidFill')) : null
        const inheritedColor = first(...defaults.map(item => colorFrom(deck, child(item, 'solidFill'))))
        const color = ownColor ?? options.defaultColor ?? fontRefColor ?? inheritedColor ?? (defaultText ? `#${defaultText}` : '#000000')
        const bold = (get('b') ?? (options.defaultBold ? '1' : '0')) === '1' || get('b') === 'true'
        const italic = get('i') === '1' || get('i') === 'true'
        const caps = get('cap') === 'all'
        const underline = !!get('u') && get('u') !== 'none'
        return { sizePx: Math.max(1, sizePx), font: `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${Math.max(1, sizePx)}px ${fontFamily(deck, typeface)}`, color, caps, underline }
      }

      const numAttr = (name: string): number => {
        const value = Number(lvlAttr(name))
        return Number.isFinite(value) ? value * deck.scale : 0
      }
      const marL = numAttr('marL')
      const indent = numAttr('indent')
      const align = lvlAttr('algn') ?? 'l'
      const lnSpcNode = lvlChild('lnSpc')
      const lineFactor = (attrNum(child(lnSpcNode, 'spcPct'), 'val') ?? 100000) / 100000
      const spacing = (name: string, size: number): number => {
        const node = lvlChild(name)
        const points = attrNum(child(node, 'spcPts'), 'val')
        if (points != null) {
          return (points / 100) * EMU_PER_PT * deck.scale
        }
        const percent = attrNum(child(node, 'spcPct'), 'val')
        return percent != null ? (percent / 100000) * size * 1.2 : 0
      }

      // Viñeta
      let bulletChar: string | null = null
      let autoNumber = false
      if (!lvlChild('buNone')) {
        const char = lvlChild('buChar')?.getAttribute('char') ?? null
        if (char) {
          const font = lvlChild('buFont')?.getAttribute('typeface') ?? ''
          bulletChar = /wingdings|symbol/i.test(font) ? (WINGDINGS_BULLETS[char] ?? '•') : char
        }
        else if (lvlChild('buAutoNum')) {
          autoNumber = true
        }
      }
      const paragraphHasText = runs.some(run => run.text.trim())
      let bullet: (NonNullable<Line['bullet']>) | null = null
      if ((bulletChar || autoNumber) && paragraphHasText) {
        if (level < previousLevel) {
          for (const key of Object.keys(counter)) {
            if (Number(key) > level) {
              delete counter[Number(key)]
            }
          }
        }
        counter[level] = (counter[level] ?? 0) + 1
        const style = resolveRun(runs.find(run => run.text.trim())?.props ?? null)
        bullet = { text: autoNumber ? `${counter[level]}.` : bulletChar!, font: style.font, color: colorFrom(deck, lvlChild('buClr')) ?? style.color, size: style.sizePx, left: 0 }
      }
      else if (paragraphHasText) {
        counter = {}
      }
      previousLevel = level

      // Con viñeta: la viñeta va en marL+indent y el texto en marL (sangría francesa), con un mínimo de separación.
      const bulletLeft = Math.max(0, marL + indent)
      const textLeft = bullet ? Math.max(marL, bulletLeft + bullet.size * 0.9) : marL
      const firstLeft = bullet ? textLeft : Math.max(0, marL + indent)
      if (bullet) {
        bullet.left = bulletLeft
      }
      const available = (left: number) => Math.max(10, innerW - left)

      // Corte de líneas
      const paragraphLines: Line[] = []
      const newLine = (isFirst: boolean): Line => {
        const left = isFirst ? firstLeft : textLeft
        return { pieces: [], width: 0, height: 0, baseline: 0, left, avail: available(left), align, before: 0, bullet: null }
      }
      let line = newLine(true)
      const flush = () => {
        // Se quitan los espacios del final para alinear bien.
        while (line.pieces.length && line.pieces[line.pieces.length - 1]!.space) {
          line.width -= line.pieces.pop()!.width
        }
        paragraphLines.push(line)
        line = newLine(false)
      }
      let maxSizeInParagraph = resolveRun(null).sizePx
      if (!runs.length) {
        const emptySize = resolveRun(child(paragraph, 'endParaRPr')).sizePx
        maxSizeInParagraph = emptySize
        line.height = emptySize * 1.2 * lineFactor
        line.baseline = emptySize * 1.2 * lineFactor - emptySize * 0.25
      }
      for (const run of runs) {
        const style = resolveRun(run.props)
        maxSizeInParagraph = Math.max(maxSizeInParagraph, style.sizePx)
        if (run.newline) {
          line.height = Math.max(line.height, style.sizePx * 1.2 * lineFactor)
          line.baseline = Math.max(line.baseline, style.sizePx * 1.2 * lineFactor - style.sizePx * 0.25)
          flush()
          continue
        }
        const text = style.caps ? run.text.toUpperCase() : run.text
        ctx.font = style.font
        for (const token of text.match(/\s+|[^\s]+/g) ?? []) {
          const space = /^\s+$/.test(token)
          const width = ctx.measureText(token).width
          if (wrap && !space && line.pieces.some(piece => !piece.space) && line.width + width > line.avail) {
            flush()
          }
          if (space && !line.pieces.length) {
            continue
          }
          line.pieces.push({ text: token, font: style.font, color: style.color, size: style.sizePx, underline: style.underline, width, space })
          line.width += width
          line.height = Math.max(line.height, style.sizePx * 1.2 * lineFactor)
          line.baseline = Math.max(line.baseline, style.sizePx * 1.2 * lineFactor - style.sizePx * 0.25)
        }
      }
      if (line.pieces.length || !paragraphLines.length) {
        if (!line.height) {
          line.height = maxSizeInParagraph * 1.2 * lineFactor
          line.baseline = line.height - maxSizeInParagraph * 0.25
        }
        flush()
      }
      if (bullet) {
        paragraphLines[0]!.bullet = bullet
      }
      paragraphLines[0]!.before = lines.length ? spacing('spcBef', maxSizeInParagraph) : 0
      paragraphLines[paragraphLines.length - 1]!.height += spacing('spcAft', maxSizeInParagraph)
      lines.push(...paragraphLines)
    }
    return { lines, height: lines.reduce((sum, item) => sum + item.height + item.before, 0) }
  }

  let shrink = 1
  let laidOut = layout(shrink)
  if (canShrink) {
    for (let i = 0; i < 6 && laidOut.height > innerH; i++) {
      shrink *= 0.88
      laidOut = layout(shrink)
    }
  }

  let y = rect.y + inset.t
  if (anchor === 'ctr') {
    y += (innerH - laidOut.height) / 2
  }
  else if (anchor === 'b') {
    y += innerH - laidOut.height
  }

  // Un texto que desborda su caja se ve (PowerPoint también lo muestra); no se recorta.
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  for (const line of laidOut.lines) {
    y += line.before
    const baselineY = y + line.baseline
    let x = rect.x + inset.l + line.left
    if (line.align === 'ctr') {
      x += (line.avail - line.width) / 2
    }
    else if (line.align === 'r') {
      x += line.avail - line.width
    }
    if (line.bullet) {
      ctx.font = line.bullet.font
      ctx.fillStyle = line.bullet.color
      ctx.fillText(line.bullet.text, rect.x + inset.l + line.bullet.left, baselineY)
    }
    for (const piece of line.pieces) {
      ctx.font = piece.font
      ctx.fillStyle = piece.color
      ctx.fillText(piece.text, x, baselineY)
      if (piece.underline && !piece.space) {
        ctx.fillRect(x, baselineY + piece.size * 0.1, piece.width, Math.max(1, piece.size * 0.06))
      }
      x += piece.width
    }
    y += line.height
  }
  return true
}

// ------------------------------------------------------------------------------------------------------------- formas

interface LayerOptions {
  /** En plantilla/patrón solo se dibujan las formas que no son placeholders. */
  skipPlaceholders: boolean
  part: Part
}

function lineOf(deck: Deck, sp: Element, chain: Element[]): { color: string, width: number } | null {
  const ln = first(...chain.map(item => child(child(item, 'spPr'), 'ln')))
  if (ln && child(ln, 'noFill')) {
    return null
  }
  const explicit = ln ? colorFrom(deck, child(ln, 'solidFill')) : null
  const style = child(sp, 'style')
  const reference = child(style, 'lnRef')
  const referenceIndex = attrNum(reference, 'idx') ?? 0
  const referenceColor = colorFrom(deck, reference)
  let color = explicit
  let width = ln ? attrNum(ln, 'w') : null
  if (!color && referenceIndex > 0 && referenceColor) {
    color = referenceColor
    const themeLine = themeStyleEntry(deck, 'lnStyleLst', referenceIndex - 1)
    width = width ?? attrNum(themeLine, 'w')
  }
  return color ? { color, width: Math.max(1, (width ?? 12700) * deck.scale) } : null
}

async function drawSp(deck: Deck, sp: Element, matrix: Matrix, layer: LayerOptions): Promise<void> {
  const isPlaceholder = !!placeholderOf(sp)
  if (isPlaceholder && layer.skipPlaceholders) {
    return
  }
  const chain = layer.skipPlaceholders ? [sp] : placeholderChain(deck, sp)
  const xfrm = first(...chain.map(item => readXfrm(child(item, 'spPr'))))
  if (!xfrm || (xfrm.cx <= 0 && xfrm.cy <= 0)) {
    return
  }
  const rect = toRect(deck, matrix, xfrm)
  const { ctx } = deck
  const spPr = child(sp, 'spPr')
  const geometry = first(...chain.map(item => child(child(item, 'spPr'), 'prstGeom')))
  const custom = !!child(spPr, 'custGeom')
  const preset = geometry?.getAttribute('prst') ?? 'rect'
  const adjustMatch = /val\s+(-?\d+)/.exec(descendant(geometry, 'gd')?.getAttribute('fmla') ?? '')
  const adjust = adjustMatch ? Number(adjustMatch[1]) : null

  // Relleno: propio / heredado del placeholder / referencia de estilo
  const style = child(sp, 'style')
  const fillRefIndex = attrNum(child(style, 'fillRef'), 'idx') ?? 0
  const fillRefColor = colorFrom(deck, child(style, 'fillRef'))
  let fill: Fill = null
  for (const item of chain) {
    fill = await fillOf(deck, layer.part, child(item, 'spPr'), rect)
    if (fill) {
      break
    }
  }
  if (!fill && fillRefIndex > 0 && fillRefColor) {
    const entry = fillRefIndex >= 1001 ? themeStyleEntry(deck, 'bgFillStyleLst', fillRefIndex - 1001) : themeStyleEntry(deck, 'fillStyleLst', fillRefIndex - 1)
    fill = (entry ? await fillOf(deck, layer.part, wrapSingle(entry), rect, fillRefColor) : null) ?? { type: 'style', value: fillRefColor }
  }
  const stroke = lineOf(deck, sp, chain)
  const fontRefColor = colorFrom(deck, child(style, 'fontRef'))

  ctx.save()
  applyOrientation(deck, rect, xfrm)
  const trace = geometryPath(deck, preset, adjust, rect)
  let painted = false
  if (!custom) {
    painted = paintFill(deck, fill, rect, trace)
    if (stroke && preset !== 'line') {
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.width
      ctx.beginPath()
      trace()
      ctx.stroke()
      painted = true
    }
  }
  const txBody = child(sp, 'txBody')
  let drewText = false
  if (txBody) {
    drewText = drawTextBody(deck, txBody, chain, styleKindOf(sp), rect, fontRefColor)
  }
  ctx.restore()
  if (painted || drewText) {
    deck.drawn++
  }
}

async function drawPic(deck: Deck, pic: Element, matrix: Matrix, layer: LayerOptions): Promise<void> {
  const xfrm = readXfrm(child(pic, 'spPr'))
  if (!xfrm) {
    return
  }
  const blip = await blipOf(deck, layer.part, child(pic, 'blipFill'))
  if (!blip) {
    return
  }
  const rect = toRect(deck, matrix, xfrm)
  deck.ctx.save()
  applyOrientation(deck, rect, xfrm)
  drawBitmap(deck, blip.bitmap, blip.src, rect)
  const stroke = lineOf(deck, pic, [pic])
  if (stroke && child(child(child(pic, 'spPr'), 'ln'), 'solidFill')) {
    deck.ctx.strokeStyle = stroke.color
    deck.ctx.lineWidth = stroke.width
    deck.ctx.strokeRect(rect.x, rect.y, rect.w, rect.h)
  }
  deck.ctx.restore()
  deck.drawn++
}

function drawConnector(deck: Deck, node: Element, matrix: Matrix): void {
  const xfrm = readXfrm(child(node, 'spPr'))
  if (!xfrm) {
    return
  }
  const stroke = lineOf(deck, node, [node])
  if (!stroke) {
    return
  }
  const rect = toRect(deck, matrix, xfrm)
  const { ctx } = deck
  ctx.save()
  applyOrientation(deck, rect, xfrm)
  ctx.strokeStyle = stroke.color
  ctx.lineWidth = stroke.width
  ctx.beginPath()
  ctx.moveTo(rect.x, rect.y)
  ctx.lineTo(rect.x + rect.w, rect.y + rect.h)
  ctx.stroke()
  ctx.restore()
  deck.drawn++
}

function drawFrame(deck: Deck, frame: Element, matrix: Matrix): void {
  const xfrm = readXfrm(frame)
  if (!xfrm) {
    return
  }
  const rect = toRect(deck, matrix, xfrm)
  const { ctx } = deck
  const table = descendant(frame, 'tbl')
  if (!table) {
    // Gráfica, SmartArt, objeto OLE: no se renderiza, solo se marca el lugar.
    ctx.save()
    ctx.fillStyle = 'rgba(148,163,184,0.12)'
    ctx.strokeStyle = 'rgba(148,163,184,0.7)'
    ctx.lineWidth = 1
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h)
    ctx.restore()
    deck.drawn++
    return
  }

  const tblPr = child(table, 'tblPr')
  const headerRow = tblPr?.getAttribute('firstRow') === '1'
  const banded = tblPr?.getAttribute('bandRow') === '1'
  const accent = deck.colors.accent1 ? `#${deck.colors.accent1}` : '#4472C4'
  const light = (() => {
    const hsl = rgbToHsl(hexToRgb(accent))
    return `#${hslToRgb([hsl[0], hsl[1], 0.9]).map(v => v.toString(16).padStart(2, '0')).join('')}`
  })()
  const columns = childrenOf(child(table, 'tblGrid'), 'gridCol').map(col => (attrNum(col, 'w') ?? 0) * matrix.sx * deck.scale)
  let y = rect.y
  childrenOf(table, 'tr').forEach((row, rowIndex) => {
    const rowH = (attrNum(row, 'h') ?? 370840) * matrix.sy * deck.scale
    let x = rect.x
    let columnIndex = 0
    for (const cell of childrenOf(row, 'tc')) {
      const span = attrNum(cell, 'gridSpan') ?? 1
      const cellW = columns.slice(columnIndex, columnIndex + span).reduce((sum, value) => sum + value, 0)
      columnIndex += span
      if (cell.getAttribute('hMerge') === '1' || cell.getAttribute('vMerge') === '1') {
        x += cellW
        continue
      }
      const tcPr = child(cell, 'tcPr')
      const explicit = colorFrom(deck, child(tcPr, 'solidFill'))
      const isHeader = headerRow && rowIndex === 0
      const background = explicit ?? (isHeader ? accent : banded && rowIndex % 2 === 1 ? light : null)
      const cellRect: Rect = { x, y, w: cellW, h: rowH }
      if (background) {
        ctx.fillStyle = background
        ctx.fillRect(x, y, cellW, rowH)
      }
      ctx.strokeStyle = 'rgba(148,163,184,0.6)'
      ctx.lineWidth = 1
      ctx.strokeRect(x, y, cellW, rowH)
      const body = child(cell, 'txBody')
      if (body) {
        drawTextBody(deck, body, [], 'other', cellRect, null, {
          inset: {
            l: (attrNum(tcPr, 'marL') ?? 91440) * deck.scale,
            t: (attrNum(tcPr, 'marT') ?? 45720) * deck.scale,
            r: (attrNum(tcPr, 'marR') ?? 91440) * deck.scale,
            b: (attrNum(tcPr, 'marB') ?? 45720) * deck.scale,
          },
          anchor: tcPr?.getAttribute('anchor') ?? 't',
          defaultColor: explicit || !isHeader ? null : '#ffffff',
          defaultBold: isHeader,
          autofit: true,
          wrap: true,
        })
      }
      x += cellW
    }
    y += rowH
  })
  deck.drawn++
}

async function drawTree(deck: Deck, tree: Element | null, matrix: Matrix, layer: LayerOptions): Promise<void> {
  for (const node of childrenOf(tree)) {
    checkBudget(deck)
    if (++deck.shapes > MAX_SHAPES) {
      throw new Error('Demasiadas formas')
    }
    switch (node.localName) {
      case 'sp':
        await drawSp(deck, node, matrix, layer)
        break
      case 'pic':
        if (!(layer.skipPlaceholders && placeholderOf(node))) {
          await drawPic(deck, node, matrix, layer)
        }
        break
      case 'cxnSp':
        drawConnector(deck, node, matrix)
        break
      case 'graphicFrame':
        if (!layer.skipPlaceholders) {
          drawFrame(deck, node, matrix)
        }
        break
      case 'grpSp': {
        const grpSpPr = child(node, 'grpSpPr')
        const xfrmNode = child(grpSpPr, 'xfrm')
        const off = child(xfrmNode, 'off')
        const ext = child(xfrmNode, 'ext')
        const chOff = child(xfrmNode, 'chOff')
        const chExt = child(xfrmNode, 'chExt')
        let next = matrix
        if (off && ext && chOff && chExt) {
          const kx = (attrNum(chExt, 'cx') ?? 0) > 0 ? (attrNum(ext, 'cx') ?? 0) / attrNum(chExt, 'cx')! : 1
          const ky = (attrNum(chExt, 'cy') ?? 0) > 0 ? (attrNum(ext, 'cy') ?? 0) / attrNum(chExt, 'cy')! : 1
          next = {
            sx: matrix.sx * kx,
            sy: matrix.sy * ky,
            tx: matrix.tx + matrix.sx * ((attrNum(off, 'x') ?? 0) - (attrNum(chOff, 'x') ?? 0) * kx),
            ty: matrix.ty + matrix.sy * ((attrNum(off, 'y') ?? 0) - (attrNum(chOff, 'y') ?? 0) * ky),
          }
        }
        await drawTree(deck, node, next, layer)
        break
      }
    }
  }
}

// -------------------------------------------------------------------------------------------------------- orquestación

function themeColors(theme: Document | null): { colors: Record<string, string>, major: string, minor: string } {
  const colors: Record<string, string> = {
    dk1: '000000', lt1: 'FFFFFF', dk2: '44546A', lt2: 'E7E6E6', accent1: '4472C4', accent2: 'ED7D31', accent3: 'A5A5A5',
    accent4: 'FFC000', accent5: '5B9BD5', accent6: '70AD47', hlink: '0563C1', folHlink: '954F72',
  }
  let major = 'Calibri Light'
  let minor = 'Calibri'
  if (theme) {
    const scheme = descendant(theme, 'clrScheme')
    for (const node of childrenOf(scheme)) {
      const inner = node.firstElementChild
      const value = inner?.getAttribute('val') && inner.localName === 'srgbClr' ? inner.getAttribute('val') : inner?.getAttribute('lastClr')
      if (value && /^[0-9a-f]{6}$/i.test(value)) {
        colors[node.localName] = value.toUpperCase()
      }
    }
    major = child(descendant(theme, 'majorFont'), 'latin')?.getAttribute('typeface') || major
    minor = child(descendant(theme, 'minorFont'), 'latin')?.getAttribute('typeface') || minor
  }
  return { colors, major, minor }
}

/** Muestrea unos puntos del canvas: ¿todo es blanco? */
function isPlainWhite(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): boolean {
  const points = [[0.05, 0.05], [0.5, 0.5], [0.95, 0.05], [0.05, 0.95], [0.95, 0.95], [0.25, 0.75]]
  return points.every(([px, py]) => {
    const [r, g, b, a] = ctx.getImageData(Math.floor(canvas.width * px!), Math.floor(canvas.height * py!), 1, 1).data
    return r! > 250 && g! > 250 && b! > 250 && a! > 250
  })
}

async function buildThumbnail(file: File, width: number): Promise<Blob | null> {
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(file) as unknown as ZipLike

  const presentation = await loadPart(zip, 'ppt/presentation.xml')
  if (!presentation) {
    return null
  }
  const slideId = descendant(descendant(presentation.doc, 'sldIdLst'), 'sldId')
  const slideRel = slideId ? (slideId.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') ?? slideId.getAttribute('r:id')) : null
  const slidePath = (slideRel ? presentation.rels.get(slideRel)?.path : null) ?? 'ppt/slides/slide1.xml'
  const slide = await loadPart(zip, slidePath)
  if (!slide) {
    return null
  }
  const layout = await loadPart(zip, relOfType(slide, '/slideLayout') ?? '')
  const master = layout ? await loadPart(zip, relOfType(layout, '/slideMaster') ?? '') : null
  const themePart = await loadPart(zip, relOfType(master, '/theme') ?? 'ppt/theme/theme1.xml')
  const theme = themePart?.doc ?? null

  const size = descendant(presentation.doc, 'sldSz')
  const slideW = attrNum(size, 'cx') ?? DEFAULT_SLIDE.cx
  const slideH = attrNum(size, 'cy') ?? DEFAULT_SLIDE.cy
  if (slideW <= 0 || slideH <= 0) {
    return null
  }

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(width * slideH / slideW))
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return null
  }

  const { colors, major, minor } = themeColors(theme)
  const clrMap: Record<string, string> = { bg1: 'lt1', tx1: 'dk1', bg2: 'lt2', tx2: 'dk2' }
  const mapNode = master ? descendant(master.doc, 'clrMap') : null
  for (const name of ['bg1', 'tx1', 'bg2', 'tx2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink']) {
    const mapped = mapNode?.getAttribute(name)
    if (mapped) {
      clrMap[name] = mapped
    }
  }
  const layoutOverride = layout ? child(descendant(layout.doc, 'clrMapOvr'), 'overrideClrMapping') : null
  for (const name of Object.keys(clrMap)) {
    const mapped = layoutOverride?.getAttribute(name)
    if (mapped) {
      clrMap[name] = mapped
    }
  }

  const deck: Deck = {
    zip,
    ctx,
    scale: canvas.width / slideW,
    width: canvas.width,
    height: canvas.height,
    colors,
    clrMap,
    majorFont: major,
    minorFont: minor,
    theme,
    defaultTextStyle: child(presentation.doc.documentElement, 'defaultTextStyle'),
    masterTxStyles: master ? descendant(master.doc, 'txStyles') : null,
    slide,
    layout,
    master,
    bitmaps: new Map(),
    shapes: 0,
    drawn: 0,
    deadline: performance.now() + RENDER_BUDGET_MS,
  }

  try {
    const explicitBackground = await paintBackground(deck)
    const identity: Matrix = { sx: 1, sy: 1, tx: 0, ty: 0 }
    const showFrom = (part: Part | null): boolean => part?.doc.documentElement.getAttribute('showMasterSp') !== '0'
    const spTree = (part: Part | null): Element | null => (part ? child(child(part.doc.documentElement, 'cSld'), 'spTree') : null)

    if (showFrom(slide) && showFrom(layout) && master) {
      await drawTree(deck, spTree(master), identity, { skipPlaceholders: true, part: master })
    }
    if (showFrom(slide) && layout) {
      await drawTree(deck, spTree(layout), identity, { skipPlaceholders: true, part: layout })
    }
    const backgroundDrawn = deck.drawn
    await drawTree(deck, spTree(slide), identity, { skipPlaceholders: false, part: slide })
    // Una diapositiva totalmente vacía sobre fondo blanco liso no aporta nada: sin miniatura.
    if (!deck.drawn && !backgroundDrawn && !(explicitBackground && !isPlainWhite(ctx, canvas))) {
      return null
    }
    return await new Promise<Blob | null>(resolve => canvas.toBlob(blob => resolve(blob), 'image/png'))
  }
  finally {
    for (const bitmap of deck.bitmaps.values()) {
      bitmap?.close()
    }
  }
}

/**
 * PNG (de `width` px de ancho) con una representación aproximada de la primera diapositiva, o `null` si no se pudo
 * (archivo dañado o protegido, diapositiva vacía, demasiado grande o lenta). Nunca lanza.
 */
export async function renderPresentationThumbnail(file: File, width: number): Promise<Blob | null> {
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
