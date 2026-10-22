/**
 * Menciones `@usuario`. El texto que se guarda y se envía al backend lleva el token `@[Nombre Apellido](id)`; en pantalla
 * se ve como `@Nombre Apellido` (chip). Este módulo convierte entre las dos formas.
 *
 * El backend saca los ids con la misma expresión: `/@\[([^\]\n]+)\]\((\d+)\)/g`.
 */

export const MENTION_SOURCE = String.raw`@\[([^\]\n]+)\]\((\d+)\)`

/** Una expresión nueva en cada uso: las globales guardan `lastIndex`. */
export function createMentionRegExp(): RegExp {
  return new RegExp(MENTION_SOURCE, 'g')
}

export interface MentionRef {
  name: string
  id: number
}

/** Mapa nombre → id de las menciones conocidas del texto (las que se eligieron o ya venían guardadas). */
export type MentionRegistry = Map<string, number>

export type MentionSegment =
  | { type: 'text', text: string }
  | { type: 'mention', name: string, id: number }

/** El nombre dentro de `[]` no puede llevar `]` ni saltos de línea. */
export function sanitizeMentionName(name: string): string {
  return name.replace(/[\]\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()
}

export function buildMentionToken(name: string, id: number): string {
  return `@[${sanitizeMentionName(name)}](${id})`
}

/** Trozos de texto y menciones de un texto guardado (para pintar chips). */
export function parseMentions(text: string): MentionSegment[] {
  const segments: MentionSegment[] = []
  const regexp = createMentionRegExp()
  let cursor = 0
  let match = regexp.exec(text)
  while (match) {
    if (match.index > cursor) {
      segments.push({ type: 'text', text: text.slice(cursor, match.index) })
    }
    segments.push({ type: 'mention', name: match[1] ?? '', id: Number(match[2]) })
    cursor = match.index + match[0].length
    match = regexp.exec(text)
  }
  if (cursor < text.length) {
    segments.push({ type: 'text', text: text.slice(cursor) })
  }
  return segments
}

export function hasMentions(text: string | null | undefined): boolean {
  return !!text && createMentionRegExp().test(text)
}

/** Texto plano: `@[Hector M.](24)` → `@Hector M.` (títulos, aria-labels, búsquedas). */
export function stripMentions(text: string): string {
  return text.replace(createMentionRegExp(), (_token, name: string) => `@${name}`)
}

/** Ids mencionados en un texto, sin repetir. */
export function extractMentionIds(text: string): number[] {
  const ids = new Set<number>()
  for (const segment of parseMentions(text)) {
    if (segment.type === 'mention') {
      ids.add(segment.id)
    }
  }
  return [...ids]
}

/** Texto guardado → texto que se ve en el editor (`@Nombre`), registrando las menciones encontradas. */
export function tokensToDisplay(text: string, registry?: MentionRegistry): string {
  return text.replace(createMentionRegExp(), (_token, name: string, id: string) => {
    registry?.set(name, Number(id))
    return `@${name}`
  })
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
}

/**
 * Expresión que reconoce `@Nombre` de las menciones conocidas dentro del texto del editor: va precedida de inicio o de
 * un carácter que no sea letra/dígito (un correo no cuenta) y no puede seguir con una letra/dígito (`@Ana` no es
 * parte de `@Anabel`). Los nombres más largos van primero para que `@Ana López` gane a `@Ana`.
 */
function buildKnownMentionRegExp(registry: MentionRegistry): RegExp | null {
  const names = [...registry.keys()].filter(Boolean).sort((a, b) => b.length - a.length)
  if (!names.length) {
    return null
  }
  const alternatives = names.map(escapeRegExp).join('|')
  return new RegExp(String.raw`(^|[^\p{L}\p{N}_])@(${alternatives})(?![\p{L}\p{N}_])`, 'gu')
}

/** Rangos `[inicio, fin)` de las menciones conocidas en el texto del editor. */
export function findMentionRanges(display: string, registry: MentionRegistry): { start: number, end: number, name: string }[] {
  const regexp = buildKnownMentionRegExp(registry)
  if (!regexp) {
    return []
  }
  const ranges: { start: number, end: number, name: string }[] = []
  let match = regexp.exec(display)
  while (match) {
    const prefix = match[1] ?? ''
    const name = match[2] ?? ''
    const start = match.index + prefix.length
    ranges.push({ start, end: start + 1 + name.length, name })
    match = regexp.exec(display)
  }
  return ranges
}

/** Texto del editor (`@Nombre`) → texto que se envía (`@[Nombre](id)`) con las menciones conocidas. */
export function displayToTokens(display: string, registry: MentionRegistry): string {
  const ranges = findMentionRanges(display, registry)
  if (!ranges.length) {
    return display
  }
  let result = ''
  let cursor = 0
  for (const range of ranges) {
    const id = registry.get(range.name)
    result += display.slice(cursor, range.start)
    result += id == null ? display.slice(range.start, range.end) : buildMentionToken(range.name, id)
    cursor = range.end
  }
  return result + display.slice(cursor)
}

/** Menciones del editor para pintar los chips de fondo: trozos de texto y rangos de mención. */
export function displaySegments(display: string, registry: MentionRegistry): MentionSegment[] {
  const ranges = findMentionRanges(display, registry)
  if (!ranges.length) {
    return [{ type: 'text', text: display }]
  }
  const segments: MentionSegment[] = []
  let cursor = 0
  for (const range of ranges) {
    if (range.start > cursor) {
      segments.push({ type: 'text', text: display.slice(cursor, range.start) })
    }
    segments.push({ type: 'mention', name: display.slice(range.start, range.end), id: registry.get(range.name) ?? 0 })
    cursor = range.end
  }
  if (cursor < display.length) {
    segments.push({ type: 'text', text: display.slice(cursor) })
  }
  return segments
}

/**
 * Búsqueda activa de mención en el texto antes del cursor: un `@` al inicio o tras un espacio/signo, y lo escrito después
 * (puede llevar espacios sencillos para buscar «hector mor»; un espacio doble o un salto de línea la terminan).
 * Devuelve la posición del `@` y el término, o `null` si no hay búsqueda o el cursor está dentro de una mención.
 */
export function findActiveMentionQuery(
  textBeforeCaret: string,
  caret: number,
  ranges: { start: number, end: number }[],
): { start: number, term: string } | null {
  const match = /(^|[\s(¿¡"'])@([^@\n]*)$/.exec(textBeforeCaret)
  if (!match) {
    return null
  }
  const term = match[2] ?? ''
  if (term.includes('  ') || term.length > 40) {
    return null
  }
  const start = textBeforeCaret.length - term.length - 1
  // El «@» de una mención ya elegida (o el cursor dentro de ella) no abre una búsqueda nueva, aunque se siga escribiendo
  // después del chip.
  if (ranges.some(range => range.start === start || (caret > range.start && caret <= range.end))) {
    return null
  }
  return { start, term }
}
