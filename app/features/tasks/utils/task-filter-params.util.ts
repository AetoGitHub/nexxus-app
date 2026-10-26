import type { LocationQuery } from 'vue-router'
import type { TaskListFilters, TaskType } from '~/features/tasks/types/task.types'

/** Rangos de fecha que acepta el backend (YYYY-MM-DD, extremos opcionales). */
export const TASK_FILTER_DATE_KEYS = [
  'start_date_from',
  'start_date_to',
  'wip_date_from',
  'wip_date_to',
  'final_date_from',
  'final_date_to',
] as const

type DateKey = (typeof TASK_FILTER_DATE_KEYS)[number]
type ListKey = 'project' | 'users' | 'created_by'
type BooleanKey = 'overdue' | 'completed' | 'multiple_close' | 'not_started'

const LIST_KEYS: ListKey[] = ['project', 'users', 'created_by']
const BOOLEAN_KEYS: BooleanKey[] = ['overdue', 'completed', 'multiple_close', 'not_started']
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Llaves de `TaskListFilters` que viajan en la URL y en los filtros guardados (mismos nombres que el query de las listas). */
export const TASK_FILTER_PARAM_KEYS: string[] = [
  'short_description',
  'type',
  ...LIST_KEYS,
  ...BOOLEAN_KEYS,
  ...TASK_FILTER_DATE_KEYS,
]

/** «Finalización» solo tiene sentido en tareas completadas: el backend las filtra con `completed=true`. */
export function hasFinalDateFilter(filters: TaskListFilters): boolean {
  return Boolean(filters.final_date_from || filters.final_date_to)
}

/**
 * Deja solo filtros con valor: sin textos ni listas vacías, fechas válidas y booleanos relevantes (`false` solo
 * importa en `multiple_close`). Agrega `completed` cuando se filtra por fecha de finalización.
 */
export function normalizeTaskFilters(filters: TaskListFilters = {}): TaskListFilters {
  const next: TaskListFilters = {}

  const shortDescription = filters.short_description?.trim()
  if (shortDescription) {
    next.short_description = shortDescription
  }
  if (filters.type?.length) {
    next.type = [...filters.type]
  }
  for (const key of LIST_KEYS) {
    const value = filters[key]
    if (value?.length) {
      next[key] = [...value]
    }
  }
  for (const key of TASK_FILTER_DATE_KEYS) {
    const value = filters[key]
    if (value && DATE_PATTERN.test(value)) {
      next[key] = value
    }
  }
  for (const key of BOOLEAN_KEYS) {
    const value = filters[key]
    if (value === true || (key === 'multiple_close' && value === false)) {
      next[key] = value
    }
  }
  if (hasFinalDateFilter(next)) {
    next.completed = true
  }

  return next
}

/** Filtros → params de texto (lista "2,3", booleano "true", fecha YYYY-MM-DD), solo los que tienen valor. */
export function taskFiltersToParams(filters: TaskListFilters): Record<string, string> {
  const normalized = normalizeTaskFilters(filters)
  const params: Record<string, string> = {}

  if (normalized.short_description) {
    params.short_description = normalized.short_description
  }
  if (normalized.type) {
    params.type = normalized.type.join(',')
  }
  for (const key of LIST_KEYS) {
    const value = normalized[key]
    if (value) {
      params[key] = value.join(',')
    }
  }
  for (const key of BOOLEAN_KEYS) {
    const value = normalized[key]
    if (value !== undefined) {
      params[key] = String(value)
    }
  }
  for (const key of TASK_FILTER_DATE_KEYS) {
    const value = normalized[key]
    if (value) {
      params[key] = value
    }
  }

  return params
}

function splitList(value: string): string[] {
  return value.split(',').map(item => item.trim()).filter(Boolean)
}

/** Params de texto (filtro guardado o URL) → filtros. Las llaves desconocidas (p. ej. visibilidad) se ignoran. */
export function paramsToTaskFilters(params: Record<string, unknown>): TaskListFilters {
  const filters: TaskListFilters = {}
  const text = (key: string) => {
    const value = params[key]
    return typeof value === 'string' && value.trim() ? value.trim() : undefined
  }

  const shortDescription = text('short_description')
  if (shortDescription) {
    filters.short_description = shortDescription
  }
  const type = text('type')
  if (type) {
    filters.type = splitList(type.replace(/[[\]"']/g, '')) as TaskType[]
  }
  for (const key of LIST_KEYS) {
    const value = text(key)
    if (value) {
      const ids = splitList(value).map(Number).filter(id => Number.isInteger(id) && id > 0)
      if (ids.length) {
        filters[key] = ids
      }
    }
  }
  for (const key of BOOLEAN_KEYS) {
    const value = text(key)
    if (value === 'true' || value === 'false') {
      filters[key] = value === 'true'
    }
  }
  for (const key of TASK_FILTER_DATE_KEYS) {
    const value = text(key)
    if (value) {
      filters[key as DateKey] = value
    }
  }

  return normalizeTaskFilters(filters)
}

/** Filtros de la URL de la página (mismas llaves que el query de las listas). */
export function taskFiltersFromQuery(query: LocationQuery): TaskListFilters {
  const params: Record<string, unknown> = {}
  for (const key of TASK_FILTER_PARAM_KEYS) {
    const raw = query[key]
    params[key] = Array.isArray(raw) ? raw[0] : raw
  }
  return paramsToTaskFilters(params)
}

/** Clave estable para comparar dos conjuntos de filtros sin importar el orden de las listas. */
export function taskFiltersKey(filters: TaskListFilters): string {
  const params = taskFiltersToParams(filters)
  return JSON.stringify(
    Object.keys(params).sort().map((key) => {
      const value = params[key]!
      return [key, key === 'short_description' ? value : splitList(value).sort().join(',')]
    }),
  )
}

export function hasTaskFilters(filters: TaskListFilters): boolean {
  return Object.keys(taskFiltersToParams(filters)).length > 0
}
