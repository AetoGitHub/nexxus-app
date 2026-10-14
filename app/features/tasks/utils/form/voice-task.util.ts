import type { SubtaskFormRow } from '~/features/tasks/utils/form/task-form.util'
import { createEmptySubtaskRow } from '~/features/tasks/utils/form/task-form.util'
import type { NewTaskFormType, TaskEffort, TaskRepeatConfig, UserDropdown } from '~/features/tasks/types/task.types'
import type { VoiceTaskCatalogItem, VoiceTaskResponse } from '~/features/tasks/types/voice-task.types'
import {
  buildVoiceRepeatConfig,
  findVoiceDate,
  findVoiceEffort,
  findVoiceEffortInTranscript,
  findVoiceUsersInText,
  frequencyFromWord,
  guessVoiceRepeat,
  isRepeatTypeLabel,
  normalizeVoiceText,
  transcriptMentionsRepeat,
  voiceUserAliases,
  weekdayFromValue,
} from '~/features/tasks/utils/form/voice-text.util'

/** Zona de México: el backend interpreta «hoy», «mañana» o «el viernes» según esta hora, no la UTC. */
export const VOICE_TIME_ZONE = 'America/Mexico_City'

/**
 * Contrato del webhook de voz (n8n `nexxus-voz`)
 *
 * Entra (multipart/form-data): `audio`, `user_id`, `now` (ISO con desfase de México), `timezone`, `users` (JSON:
 * `[{ id, name, username, first_name, last_name, aliases[] }]`), `projects` (JSON: `[{ id, name }]`) y `default_project_id`.
 *
 * Debe devolver un JSON con (el frontend tolera alias y formas distintas, pero lo esperado es esto):
 * - `name`, `description`, `transcript` (texto dictado), `needs_review` (bool), `ambiguities` (string[]).
 * - `assignee_ids`: ids numéricos tomados de `users` (el usuario nombrado, no quien dicta). Si no lo resuelve, se
 *   puede mandar `assignee_names` (string[]) o dejarlo vacío: el frontend lo busca en `transcript` por nombre/apellido.
 * - `due_date`: `YYYY-MM-DD` ya resuelto contra `now` («13 de octubre del 2026» → `2026-10-13`).
 * - `task_type`: `manual` | `repeat` | `volume` | `multiple_close` («repetitiva»/«recurrente» → `repeat`).
 * - `repeat_config` cuando es `repeat`: `{ frequency: daily|weekly|monthly|yearly, every, weekday 1-7, week_of_month 1-4|-1,
 *   on_month 1-12 }`. Lo que falte se deduce de `due_date` y la frecuencia sin decir se marca para revisión.
 * - `effort`: `quick` | `normal` | `complex` (o `rapida` | `normal` | `compleja`); vacío/ausente si no se mencionó (no
 *   mandar `normal` por defecto: el frontend lo toma como dicho).
 * - `urgent`, `in_backlog`, `project_id`, `subtasks` (string[] u objetos con `name`).
 * - No hace falta el grupo: el formulario toma el grupo del usuario asignado (`group_id` del dropdown de usuarios).
 */

/**
 * Fecha y hora actuales en hora local de México con su desfase (`2026-10-05T20:30:00-06:00`).
 * No sirve `toISOString()`: después de las 6:00 PM la fecha UTC ya es la del día siguiente y «hoy» o «el viernes» se desfasan.
 */
export function formatMexicoNow(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VOICE_TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)

  const get = (type: string) => parts.find(part => part.type === type)?.value ?? '00'
  const local = `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`

  // Desfase = hora local interpretada como UTC menos el instante real.
  const localAsUtc = Date.parse(`${local}Z`)
  const offsetMinutes = Math.round((localAsUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000)
  const sign = offsetMinutes < 0 ? '-' : '+'
  const abs = Math.abs(offsetMinutes)
  const offset = `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`

  return `${local}${offset}`
}

/**
 * Usuarios para la IA: id, nombre completo, username, nombre y apellidos por separado y alias («Guillermo», «Franco»,
 * «Guillermo Franco»), para que resuelva a quien nombran aunque no digan el nombre completo.
 */
export function toVoiceUsers(users: UserDropdown[]): VoiceTaskCatalogItem[] {
  return users.map((user) => {
    const first = user.first_name?.trim() ?? ''
    const last = user.last_name?.trim() ?? ''
    return {
      id: user.id,
      name: `${first} ${last}`.trim() || user.username,
      username: user.username,
      first_name: first,
      last_name: last,
      aliases: voiceUserAliases(first, last, user.username),
    }
  })
}

/** Proyectos para la IA a partir de los items del dropdown (`label` = nombre, `value` = id). */
export function toVoiceProjects(items: { label: string, value: string | number }[]): VoiceTaskCatalogItem[] {
  return items
    .filter((item): item is { label: string, value: number } => typeof item.value === 'number')
    .map(item => ({ id: item.value, name: item.label }))
}

/** Esfuerzo de la IA (`rapida` | `normal` | `compleja`, o ya `quick` | `normal` | `complex`) al del formulario. */
export function resolveVoiceEffort(value: unknown): TaskEffort | undefined {
  return typeof value === 'string' ? findVoiceEffort(value) : undefined
}

/** Tipo de tarea (`manual`, `repeat`...) a partir de lo que diga el webhook, con alias como «repetitiva» o «recurrente». */
export function resolveVoiceTaskType(value: unknown): NewTaskFormType | undefined {
  if (isRepeatTypeLabel(value)) {
    return 'repeat'
  }
  const normalized = normalizeVoiceText(value)
  if (normalized === 'manual') {
    return 'manual'
  }
  if (normalized === 'volume' || normalized === 'volumen') {
    return 'volume'
  }
  if (normalized.startsWith('multiple')) {
    return 'multiple_close'
  }
  return undefined
}

/** Subtareas dictadas: cada una puede venir como texto o como objeto con su nombre. */
export function voiceSubtaskNames(subtasks: unknown[]): string[] {
  return subtasks
    .map((subtask) => {
      if (typeof subtask === 'string') {
        return subtask
      }
      if (subtask && typeof subtask === 'object') {
        const record = subtask as Record<string, unknown>
        const name = record.short_description ?? record.name ?? record.title ?? record.description
        return typeof name === 'string' ? name : ''
      }
      return ''
    })
    .map(name => name.trim())
    .filter(Boolean)
}

/** Filas de subtareas del formulario; las subtareas piden asignado, así que llevan el primero de la tarea o, si no, quien dicta. */
export function voiceSubtaskRows(subtasks: unknown[], assigneeId: number | undefined): SubtaskFormRow[] {
  return voiceSubtaskNames(subtasks).map(name => ({
    ...createEmptySubtaskRow(),
    shortDescription: name,
    assignedTo: assigneeId,
  }))
}

/** Primer valor presente entre varios alias del mismo campo. */
function pick(data: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = data[key]
    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }
  return undefined
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** Id numérico (acepta `"12"`); `null` si no lo es. */
function asId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return Number(value.trim())
  }
  return null
}

function isTruthyFlag(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'number') {
    return value === 1
  }
  return typeof value === 'string' && ['true', '1', 'si', 'yes'].includes(normalizeVoiceText(value))
}

const ASSIGNEE_KEYS = ['assignee_ids', 'assignees', 'assigned_to', 'assignee', 'assignee_id', 'assigned_user', 'user_ids', 'assignee_names', 'assignees_names', 'assigned_to_names']

/**
 * Responsables de la tarea. El webhook puede devolver ids (números o texto), objetos `{ id, name }` o nombres; los ids
 * que no existen en el catálogo se descartan. Si no resuelve a nadie, se busca por nombre y apellido en lo dictado.
 */
function resolveAssigneeIds(data: Record<string, unknown>, users: VoiceTaskCatalogItem[], mentions: string[]): number[] {
  const knownIds = new Set(users.map(user => user.id))
  const isKnown = (id: number) => knownIds.size === 0 || knownIds.has(id)
  const ids: number[] = []
  const names: string[] = []

  const collect = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(collect)
      return
    }
    const id = asId(value)
    if (id != null) {
      ids.push(id)
      return
    }
    if (typeof value === 'string' && value.trim()) {
      names.push(value)
      return
    }
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>
      const nestedId = asId(record.id ?? record.user_id)
      if (nestedId != null) {
        ids.push(nestedId)
        return
      }
      const nestedName = asString(record.name ?? record.full_name ?? record.username)
      if (nestedName.trim()) {
        names.push(nestedName)
      }
    }
  }
  ASSIGNEE_KEYS.forEach(key => collect(data[key]))

  const resolved = new Set<number>(ids.filter(isKnown))
  for (const name of names) {
    findVoiceUsersInText(name, users).forEach(id => resolved.add(id))
  }
  if (resolved.size) {
    return [...resolved]
  }

  for (const text of mentions) {
    const found = findVoiceUsersInText(text, users)
    if (found.length) {
      return found
    }
  }
  return []
}

const REPEAT_FLAG_KEYS = ['is_recurring', 'recurring', 'is_repeat', 'is_repetitive', 'repetitive', 'recurrent', 'is_recurrent', 'repetitiva', 'recurrente']
const REPEAT_CONFIG_KEYS = ['repeat_config', 'repeat', 'recurrence', 'recurrence_config', 'recurring_config']

/** Configuración de repetición que mande el webhook (con alias), completada con la fecha; `null` si no trae frecuencia. */
function coerceRepeatConfig(value: unknown, dueDate: string | null): TaskRepeatConfig | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    const frequency = typeof value === 'string' ? frequencyFromWord(value) : undefined
    return frequency ? buildVoiceRepeatConfig({ frequency }, dueDate) : null
  }
  const record = value as Record<string, unknown>
  const frequency = frequencyFromWord(pick(record, ['frequency', 'freq', 'type', 'unit']))
  if (!frequency) {
    return null
  }
  const every = Number(pick(record, ['every', 'interval', 'n']))
  const weekOfMonth = Number(pick(record, ['week_of_month', 'weekOfMonth']))
  const onMonth = Number(pick(record, ['on_month', 'month']))
  return buildVoiceRepeatConfig({
    frequency,
    every: Number.isFinite(every) ? every : 1,
    weekday: weekdayFromValue(pick(record, ['weekday', 'day_of_week'])),
    weekOfMonth: [1, 2, 3, 4, -1].includes(weekOfMonth) ? weekOfMonth as 1 | 2 | 3 | 4 | -1 : undefined,
    onMonth: onMonth >= 1 && onMonth <= 12 ? onMonth as TaskRepeatConfig['on_month'] : undefined,
  }, dueDate)
}

/** El campo de repetición trae algo útil (no es `null`, `false` ni un objeto vacío de plantilla). */
function hasRepeatContent(value: unknown): boolean {
  if (value === true) {
    return true
  }
  if (typeof value === 'string') {
    return frequencyFromWord(value) !== undefined
  }
  return !!value && typeof value === 'object' && !Array.isArray(value)
    && Object.values(value).some(item => item !== null && item !== undefined && item !== '')
}

const DUE_DATE_KEYS = ['due_date', 'dueDate', 'due', 'deadline', 'fecha_vencimiento', 'fecha_limite', 'fecha']

/** Algunos nodos de n8n envuelven el resultado (`[ {...} ]`, `{ data: {...} }`, `{ output: {...} }`). */
function unwrapResponse(raw: unknown): Record<string, unknown> | null {
  let value = Array.isArray(raw) ? raw[0] : raw
  for (let depth = 0; depth < 3; depth += 1) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null
    }
    const record = value as Record<string, unknown>
    if (pick(record, ['name', 'task_name', 'title', 'short_description'])) {
      return record
    }
    const nested = record.task ?? record.data ?? record.output ?? record.result
    if (!nested) {
      return record
    }
    value = nested
  }
  return null
}

export interface NormalizeVoiceTaskOptions {
  /** Catálogo que se le mandó a la IA: sirve para validar ids y resolver responsables por nombre. */
  users?: VoiceTaskCatalogItem[]
  /** Fecha actual (`formatMexicoNow()`); solo para pruebas. */
  now?: string
}

/**
 * Valida y completa lo que devolvió el webhook para que el resto del código no tenga que desconfiar de cada campo:
 * tolera alias (`recurring`, `task_type: 'repetitiva'`, `effort: 'alto'`...), fechas en varios formatos y responsables
 * por nombre, y rellena con lo dictado (`transcript`) lo que el webhook no devuelva. Devuelve `null` si no trae ni
 * siquiera un nombre de tarea.
 */
export function normalizeVoiceTask(raw: unknown, options: NormalizeVoiceTaskOptions = {}): VoiceTaskResponse | null {
  const data = unwrapResponse(raw)
  if (!data) {
    return null
  }
  // Sin nombre (no dijeron qué hay que hacer) la tarea aún sirve si trae otros datos: se muestra prellenada para confirmar.
  const name = asString(pick(data, ['name', 'task_name', 'title', 'short_description'])).trim()

  const users = options.users ?? []
  const today = (options.now ?? formatMexicoNow()).slice(0, 10)
  const transcript = asString(pick(data, ['transcript', 'transcription', 'text']))
  const ambiguities = Array.isArray(data.ambiguities)
    ? data.ambiguities.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    : []

  // Fecha: la del webhook en cualquier formato; si falta o ya pasó, la que se dijo en el audio.
  const webhookDate = findVoiceDate(asString(pick(data, DUE_DATE_KEYS)), today)
  const spokenDate = findVoiceDate(transcript, today)
  const dueDate = webhookDate && webhookDate >= today ? webhookDate : (spokenDate ?? webhookDate)

  // Esfuerzo: lo dictado («esfuerzo alto») manda sobre el valor del webhook, que suele traer «normal» por defecto.
  const effortValue = pick(data, ['effort', 'esfuerzo', 'effort_level'])
  const effort = findVoiceEffortInTranscript(transcript) ?? resolveVoiceEffort(effortValue) ?? ''

  // Tipo y repetición.
  const typeLabel = pick(data, ['task_type', 'type', 'tipo'])
  const declaredType = resolveVoiceTaskType(typeLabel)
  const repeatSignal = REPEAT_FLAG_KEYS.some(key => isTruthyFlag(data[key]))
    || REPEAT_CONFIG_KEYS.some(key => hasRepeatContent(data[key]))
    || declaredType === 'repeat'
    || ((declaredType === undefined || declaredType === 'manual') && transcriptMentionsRepeat(transcript))
  const taskType = repeatSignal ? 'repeat' : (declaredType ?? 'manual')

  let repeatConfig: TaskRepeatConfig | null = null
  let repeatAssumed = false
  if (taskType === 'repeat') {
    // Sin fecha dictada el formulario deja la de hoy: el día de la repetición se deduce de esa misma.
    const repeatBase = dueDate ?? today
    for (const key of REPEAT_CONFIG_KEYS) {
      repeatConfig = coerceRepeatConfig(data[key], repeatBase)
      if (repeatConfig) {
        break
      }
    }
    if (!repeatConfig) {
      const guess = guessVoiceRepeat(transcript, repeatBase)
      repeatConfig = guess.config
      repeatAssumed = !guess.explicit
    }
  }

  const projectId = asId(pick(data, ['project_id', 'project']))
  const assigneeIds = resolveAssigneeIds(data, users, [transcript])
  const urgent = isTruthyFlag(pick(data, ['urgent', 'is_urgent', 'urgente']))
  const inBacklog = isTruthyFlag(pick(data, ['in_backlog', 'backlog']))
  const subtasks = Array.isArray(data.subtasks) ? data.subtasks : []

  const hasUsefulData = assigneeIds.length > 0 || dueDate !== null || projectId !== null || effort !== ''
    || urgent || inBacklog || taskType === 'repeat' || subtasks.length > 0
  if (!name && !hasUsefulData) {
    return null
  }

  return {
    name,
    description: asString(pick(data, ['description', 'details'])),
    task_type: taskType,
    project_id: projectId,
    due_date: dueDate,
    // Solo lo dictado: el texto de `ambiguities` puede listar a varios candidatos y no es una asignación.
    assignee_ids: assigneeIds,
    urgent,
    effort,
    subtasks,
    in_backlog: inBacklog,
    repeat_config: repeatConfig,
    repeat_assumed: repeatAssumed,
    transcript,
    needs_review: data.needs_review === true || !name,
    ambiguities,
  }
}
