import type { SubtaskFormRow } from '~/features/tasks/utils/form/task-form.util'
import { createEmptySubtaskRow } from '~/features/tasks/utils/form/task-form.util'
import type { NewTaskFormType, TaskEffort } from '~/features/tasks/types/task.types'
import type { VoiceTaskResponse } from '~/features/tasks/types/voice-task.types'

/** Zona de México: el backend interpreta «hoy», «mañana» o «el viernes» según esta hora, no la UTC. */
export const VOICE_TIME_ZONE = 'America/Mexico_City'

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

/** Esfuerzo de la IA (`rapida` | `normal` | `compleja`) al del formulario (`quick` | `normal` | `complex`). */
export function resolveVoiceEffort(value: unknown): TaskEffort | undefined {
  const normalized = typeof value === 'string'
    ? value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    : ''

  if (['rapida', 'rapido', 'quick', 'low'].includes(normalized)) {
    return 'quick'
  }
  if (['normal', 'media', 'medium'].includes(normalized)) {
    return 'normal'
  }
  if (['compleja', 'complejo', 'complex', 'alto', 'alta', 'high'].includes(normalized)) {
    return 'complex'
  }
  return undefined
}

const VOICE_TASK_TYPES: NewTaskFormType[] = ['manual', 'volume', 'multiple_close']

/** Tipo de tarea que se puede prellenar: `repeat` pide una configuración que el audio no trae. */
export function resolveVoiceTaskType(value: unknown): NewTaskFormType | undefined {
  return VOICE_TASK_TYPES.find(type => type === value)
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

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(item => typeof item === 'number')
}

/**
 * Valida y completa lo que devolvió el webhook para que el resto del código no tenga que desconfiar de cada campo.
 * Devuelve `null` si no trae ni siquiera un nombre de tarea.
 */
export function normalizeVoiceTask(raw: unknown): VoiceTaskResponse | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const data = raw as Record<string, unknown>
  const name = typeof data.name === 'string' ? data.name.trim() : ''
  if (!name) {
    return null
  }

  return {
    name,
    description: typeof data.description === 'string' ? data.description : '',
    task_type: typeof data.task_type === 'string' ? data.task_type : 'manual',
    project_id: typeof data.project_id === 'number' ? data.project_id : null,
    due_date: typeof data.due_date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(data.due_date) ? data.due_date.slice(0, 10) : null,
    assignee_ids: isNumberArray(data.assignee_ids) ? data.assignee_ids : [],
    urgent: data.urgent === true,
    effort: typeof data.effort === 'string' ? data.effort : 'normal',
    subtasks: Array.isArray(data.subtasks) ? data.subtasks : [],
    in_backlog: data.in_backlog === true,
    transcript: typeof data.transcript === 'string' ? data.transcript : '',
    needs_review: data.needs_review === true,
    ambiguities: Array.isArray(data.ambiguities)
      ? data.ambiguities.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
      : [],
  }
}
