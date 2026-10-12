import type {
  RepeatFrequency,
  RepeatMonth,
  RepeatWeekOfMonth,
  RepeatWeekday,
  TaskEffort,
  TaskRepeatConfig,
} from '~/features/tasks/types/task.types'
import type { VoiceTaskCatalogItem } from '~/features/tasks/types/voice-task.types'

/**
 * Respaldos del lado del cliente para lo que el webhook de voz no devuelva (o devuelva con otra forma): se leen del
 * texto dictado (`transcript`) y de los alias de campos. Todo es texto normalizado: minúsculas, sin acentos y sin signos.
 */

/** Minúsculas, sin acentos ni signos; los espacios se colapsan en uno. */
export function normalizeVoiceText(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/* -------------------------------------------------------------------------- */
/* Esfuerzo                                                                    */
/* -------------------------------------------------------------------------- */

const EFFORT_PATTERNS: { effort: TaskEffort, pattern: RegExp }[] = [
  { effort: 'quick', pattern: /\b(rapid[oa]s?|facil(?:es)?|sencill[oa]s?|bajo|baja|low|quick|easy|simple|ligero|ligera)\b/ },
  { effort: 'normal', pattern: /\b(normal(?:es)?|medi[oa]|medium|moderad[oa]|regular|estandar|standard)\b/ },
  { effort: 'complex', pattern: /\b(complej[oa]s?|complex|alto|alta|high|dificil(?:es)?|hard|pesad[oa]|mucho)\b/ },
]

/**
 * Esfuerzo que aparece en un texto: el primero que se menciona (con «normal o alto» gana «normal»).
 * Acepta español e inglés y devuelve el valor del formulario.
 */
export function findVoiceEffort(text: string): TaskEffort | undefined {
  const normalized = normalizeVoiceText(text)
  let best: { effort: TaskEffort, index: number } | undefined
  for (const { effort, pattern } of EFFORT_PATTERNS) {
    const index = normalized.search(pattern)
    if (index >= 0 && (!best || index < best.index)) {
      best = { effort, index }
    }
  }
  return best?.effort
}

/** Esfuerzo dictado dentro de la transcripción: las palabras que siguen (o, si no hay, las que anteceden) a «esfuerzo». */
export function findVoiceEffortInTranscript(transcript: string): TaskEffort | undefined {
  const tokens = normalizeVoiceText(transcript).split(' ')
  const at = tokens.indexOf('esfuerzo')
  if (at < 0) {
    return undefined
  }
  return findVoiceEffort(tokens.slice(at + 1, at + 4).join(' '))
    ?? findVoiceEffort(tokens.slice(Math.max(0, at - 2), at).join(' '))
}

/* -------------------------------------------------------------------------- */
/* Fechas                                                                      */
/* -------------------------------------------------------------------------- */

const MONTH_NUMBERS: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
}

const MONTH_PATTERN = Object.keys(MONTH_NUMBERS).join('|')

function toDateKey(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Fecha (`YYYY-MM-DD`) que aparece escrita en un texto: ISO (con o sin hora), `13/10/2026` (día primero, como en México)
 * o «13 de octubre del 2026». Sin año se toma la próxima vez que llega esa fecha a partir de `todayKey`.
 */
export function findVoiceDate(text: string, todayKey: string): string | null {
  if (!text) {
    return null
  }

  const iso = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text)
  if (iso) {
    return toDateKey(Number(iso[1]), Number(iso[2]), Number(iso[3]))
  }

  const numeric = /(?<!\d)(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?!\d)/.exec(text)
  if (numeric) {
    return toDateKey(Number(numeric[3]), Number(numeric[2]), Number(numeric[1]))
  }

  const written = new RegExp(`(?<!\\d)(\\d{1,2})\\s*(?:de\\s+)?(${MONTH_PATTERN})(?:\\s+(?:del?|en)\\s+(\\d{4})|\\s+(\\d{4}))?(?!\\d)`).exec(normalizeVoiceText(text))
  if (!written) {
    return null
  }

  const day = Number(written[1])
  const month = MONTH_NUMBERS[written[2] ?? ''] ?? 0
  const explicitYear = written[3] ?? written[4]
  if (explicitYear) {
    return toDateKey(Number(explicitYear), month, day)
  }

  const todayYear = Number(todayKey.slice(0, 4))
  const thisYear = toDateKey(todayYear, month, day)
  if (thisYear && thisYear >= todayKey) {
    return thisYear
  }
  return toDateKey(todayYear + 1, month, day)
}

/** Día de la semana ISO (1=lunes … 7=domingo) de una fecha `YYYY-MM-DD`. */
export function isoWeekdayOf(dateKey: string): RepeatWeekday {
  const day = new Date(`${dateKey}T00:00:00Z`).getUTCDay()
  return (day === 0 ? 7 : day) as RepeatWeekday
}

/* -------------------------------------------------------------------------- */
/* Repetición                                                                  */
/* -------------------------------------------------------------------------- */

const REPEAT_TYPE_WORDS = ['repeat', 'repetitiva', 'repetitivo', 'repetitiv', 'recurrent', 'recurrente', 'recurring', 'recurrence', 'recurrencia', 'periodica', 'periodico', 'periodic']

/** `task_type` (o cualquier etiqueta) que significa «tarea repetitiva». */
export function isRepeatTypeLabel(value: unknown): boolean {
  const normalized = normalizeVoiceText(value)
  return !!normalized && REPEAT_TYPE_WORDS.some(word => normalized === word || normalized.startsWith(word))
}

const WEEKDAY_NAMES: Record<string, RepeatWeekday> = {
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
  domingo: 7,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7,
}

const NUMBER_WORDS: Record<string, number> = {
  un: 1,
  una: 1,
  uno: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  quince: 15,
  veinte: 20,
  treinta: 30,
}

const FREQUENCY_WORDS: { frequency: RepeatFrequency, pattern: RegExp }[] = [
  { frequency: 'daily', pattern: /^(daily|diari[oa]|diariamente|dias?|day|days)$/ },
  { frequency: 'weekly', pattern: /^(weekly|semanal|semanalmente|semanas?|week|weeks)$/ },
  { frequency: 'monthly', pattern: /^(monthly|mensual|mensualmente|meses|mes|month|months)$/ },
  { frequency: 'yearly', pattern: /^(yearly|annual|anual|anualmente|anos?|year|years)$/ },
]

/** Frecuencia a partir de una palabra suelta (`semanal`, `weekly`, `meses`...). */
export function frequencyFromWord(value: unknown): RepeatFrequency | undefined {
  const normalized = normalizeVoiceText(value)
  return FREQUENCY_WORDS.find(entry => entry.pattern.test(normalized))?.frequency
}

/** Día de la semana ISO a partir de un número (1-7) o un nombre (`lunes`, `monday`). */
export function weekdayFromValue(value: unknown): RepeatWeekday | undefined {
  if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value.trim()))) {
    const n = Number(value)
    return n >= 1 && n <= 7 ? n as RepeatWeekday : undefined
  }
  return WEEKDAY_NAMES[normalizeVoiceText(value)]
}

/** Semana del mes (1-4, o -1 la última) de una fecha: el «segundo martes» o «último viernes» de su mes. */
function weekOfMonthOf(dateKey: string): RepeatWeekOfMonth {
  const day = Number(dateKey.slice(8, 10))
  const week = Math.ceil(day / 7)
  return week >= 5 ? -1 : week as RepeatWeekOfMonth
}

export interface VoiceRepeatGuess {
  config: TaskRepeatConfig
  /** `false` si la frecuencia no se dijo ni vino del webhook (se tomó un valor por defecto). */
  explicit: boolean
}

/**
 * Configuración de repetición deducida del texto dictado: «cada semana», «cada 2 semanas», «todos los lunes»,
 * «mensual»... Lo que falte (día de la semana, semana del mes, mes) se toma de la fecha de vencimiento.
 */
export function guessVoiceRepeat(transcript: string, dueDate: string | null): VoiceRepeatGuess {
  const normalized = normalizeVoiceText(transcript)
  let frequency: RepeatFrequency | undefined
  let every = 1
  let weekday: RepeatWeekday | undefined

  const everyMatch = /\bcada\s+(\d{1,3}|[a-z]+)\s+(dias?|semanas?|meses|mes|anos?)\b/.exec(normalized)
  if (everyMatch) {
    const count = /^\d+$/.test(everyMatch[1] ?? '') ? Number(everyMatch[1]) : NUMBER_WORDS[everyMatch[1] ?? '']
    frequency = frequencyFromWord(everyMatch[2])
    if (count && frequency) {
      every = count
    }
  }

  if (!frequency) {
    const bare = /\b(cada|todos los|todas las)\s+(dia|dias|semana|semanas|mes|meses|ano|anos)\b/.exec(normalized)
    frequency = frequencyFromWord(bare?.[2])
      ?? frequencyFromWord(/\b(diariamente|diaria|diario|semanalmente|semanal|mensualmente|mensual|anualmente|anual)\b/.exec(normalized)?.[1])
  }

  if (!frequency && /\bquincenal(?:mente)?\b/.test(normalized)) {
    frequency = 'weekly'
    every = 2
  }

  const namedWeekday = /\b(?:cada|todos los|todas los|los)\s+(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/.exec(normalized)?.[1]
  if (namedWeekday) {
    weekday = WEEKDAY_NAMES[namedWeekday]
    frequency ??= 'weekly'
  }

  return {
    config: buildVoiceRepeatConfig({ frequency: frequency ?? 'weekly', every, weekday }, dueDate),
    explicit: !!frequency,
  }
}

/**
 * Arma una configuración de repetición completa: lo que no se dictó (día de la semana, semana del mes, mes) sale de
 * la fecha de vencimiento (la tarea del 13 de octubre de 2026, que cae en martes, se repite «el martes»).
 */
export function buildVoiceRepeatConfig(
  parts: {
    frequency: RepeatFrequency
    every?: number
    weekday?: RepeatWeekday | null
    weekOfMonth?: RepeatWeekOfMonth | null
    onMonth?: RepeatMonth | null
  },
  dueDate: string | null,
): TaskRepeatConfig {
  const { frequency } = parts
  const every = Number.isFinite(parts.every) && (parts.every ?? 0) >= 1 ? Math.floor(parts.every as number) : 1
  return {
    frequency,
    every,
    weekday: frequency === 'daily' ? null : (parts.weekday ?? (dueDate ? isoWeekdayOf(dueDate) : 1)),
    week_of_month: frequency === 'monthly' || frequency === 'yearly'
      ? (parts.weekOfMonth ?? (dueDate ? weekOfMonthOf(dueDate) : 1))
      : null,
    on_month: frequency === 'yearly'
      ? (parts.onMonth ?? (dueDate ? Number(dueDate.slice(5, 7)) as RepeatMonth : 1))
      : null,
  }
}

/** Señales claras de repetición en lo dictado, aunque el webhook no marque el tipo. */
export function transcriptMentionsRepeat(transcript: string): boolean {
  const normalized = normalizeVoiceText(transcript)
  if (!normalized) {
    return false
  }
  return /\b(repetitiv[oa]s?|recurrentes?|recurrencia|periodic[oa]|se repite|que se repita|repetir)\b/.test(normalized)
    || /\bcada\s+(\d{1,3}|[a-z]+)\s+(dias?|semanas?|meses|mes|anos?)\b/.test(normalized)
    || /\b(cada|todos los|todas las)\s+(dia|dias|semana|semanas|mes|meses|ano|anos|lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/.test(normalized)
    || /\b(diariamente|semanalmente|mensualmente|anualmente|quincenalmente|quincenal)\b/.test(normalized)
}

/* -------------------------------------------------------------------------- */
/* Usuarios                                                                    */
/* -------------------------------------------------------------------------- */

/** Palabras que no identifican a nadie aunque aparezcan en un nombre («de la Cruz»). */
const NAME_STOPWORDS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'da', 'di', 'van', 'von', 'san', 'santa'])

function nameTokens(value: string | undefined): string[] {
  return normalizeVoiceText(value)
    .split(' ')
    .filter(token => token.length >= 2 && !NAME_STOPWORDS.has(token))
}

interface UserForms {
  id: number
  fullName: string
  firstTokens: string[]
  lastTokens: string[]
  username: string
}

function userForms(item: VoiceTaskCatalogItem): UserForms {
  const hasParts = !!(item.first_name?.trim() || item.last_name?.trim())
  const nameParts = normalizeVoiceText(item.name).split(' ').filter(Boolean)
  const firstTokens = hasParts ? nameTokens(item.first_name) : nameTokens(nameParts[0])
  const lastTokens = hasParts ? nameTokens(item.last_name) : nameTokens(nameParts.slice(1).join(' '))
  return {
    id: item.id,
    fullName: normalizeVoiceText(item.name),
    firstTokens,
    lastTokens,
    username: normalizeVoiceText(item.username),
  }
}

function hasWord(paddedText: string, word: string): boolean {
  return word.length >= 3 && paddedText.includes(` ${word} `)
}

/** Alias con los que se suele nombrar a un usuario; ayudan a la IA a resolver «Guillermo» o «Franco». */
export function voiceUserAliases(first: string | undefined, last: string | undefined, username: string | undefined): string[] {
  const firstTokens = nameTokens(first)
  const lastTokens = nameTokens(last)
  const display = (value: string | undefined) => (value ?? '').trim()
  const aliases = new Set<string>()

  for (const word of [display(first), display(last), display(username)]) {
    if (word) {
      aliases.add(word)
    }
  }
  const firstOriginal = display(first).split(/\s+/)[0]
  const lastOriginal = display(last).split(/\s+/)[0]
  if (firstOriginal && lastOriginal) {
    aliases.add(`${firstOriginal} ${lastOriginal}`)
  }
  if (firstTokens.length > 1 || lastTokens.length > 1) {
    for (const token of [...display(first).split(/\s+/), ...display(last).split(/\s+/)]) {
      if (nameTokens(token).length) {
        aliases.add(token)
      }
    }
  }
  return [...aliases].slice(0, 8)
}

/**
 * Usuarios del catálogo nombrados en un texto, por coincidencia normalizada (sin acentos ni mayúsculas) de nombre y
 * apellido:
 * - nombre completo, o nombre + apellido, o el username → coincidencia fuerte;
 * - solo un nombre o apellido → solo si lo tiene un único usuario del catálogo (si no, es ambiguo y no se elige a nadie).
 */
export function findVoiceUsersInText(text: string, users: VoiceTaskCatalogItem[]): number[] {
  const padded = ` ${normalizeVoiceText(text)} `
  if (padded.trim() === '' || !users.length) {
    return []
  }

  const forms = users.map(userForms)

  // Cuántos usuarios llevan cada palabra: una palabra repetida («Luis») no identifica a nadie sola.
  const owners = new Map<string, Set<number>>()
  for (const form of forms) {
    for (const token of [...form.firstTokens, ...form.lastTokens]) {
      const set = owners.get(token) ?? new Set<number>()
      set.add(form.id)
      owners.set(token, set)
    }
  }

  const scored = forms.map((form) => {
    const matched = new Set<string>()
    for (const token of [...form.firstTokens, ...form.lastTokens]) {
      if (hasWord(padded, token)) {
        matched.add(token)
      }
    }

    let score = 0
    if (form.fullName && padded.includes(` ${form.fullName} `)) {
      score = 3
    }
    else if (form.firstTokens.some(token => matched.has(token)) && form.lastTokens.some(token => matched.has(token))) {
      score = 2
    }
    else if (form.username && hasWord(padded, form.username)) {
      score = 2
      matched.add(form.username)
    }
    else if ([...matched].some(token => owners.get(token)?.size === 1)) {
      score = 1
    }
    return { id: form.id, score, matched }
  }).filter(entry => entry.score > 0)

  const strong = scored.filter(entry => entry.score >= 2)
  if (strong.length) {
    // «Guillermo Franco Borjón» no debe arrastrar a otro «Guillermo Borjón Pérez»: se descarta quien coincide con menos
    // que otro; y si dos coinciden exactamente con las mismas palabras («Guillermo Borjón»), es ambiguo y no se elige.
    return strong
      .filter(entry => !strong.some(other =>
        other !== entry
        && (other.score > entry.score || other.matched.size > entry.matched.size)
        && [...entry.matched].every(token => other.matched.has(token))))
      .filter(entry => !strong.some(other =>
        other !== entry
        && other.matched.size === entry.matched.size
        && [...entry.matched].every(token => other.matched.has(token))))
      .map(entry => entry.id)
  }

  const weak = scored.filter(entry => entry.score === 1)
  return weak.length > 0 && weak.length <= 2 ? weak.map(entry => entry.id) : []
}
