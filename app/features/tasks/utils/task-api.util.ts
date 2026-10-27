import type { TaskListFilters } from '~/features/tasks/types/task.types'
import { hasFinalDateFilter, TASK_FILTER_DATE_KEYS } from '~/features/tasks/utils/task-filter-params.util'

/** Convierte filtros de UI en query params omitiendo valores vacíos. */
export function toTaskListQuery(
  filters: TaskListFilters = {},
): Record<string, string | number | boolean> {
  const query: Record<string, string | number | boolean> = {}
  const shortDescription = filters.short_description?.trim()

  if (shortDescription) {
    query.short_description = shortDescription
  }
  // Backend espera literal: type=["manual","puesto"]
  if (filters.type?.length) {
    query.type = JSON.stringify(filters.type)
  }
  if (filters.project?.length) {
    query.project = filters.project.join(',')
  }
  if (filters.users?.length) {
    query.users = filters.users.join(',')
  }
  if (filters.created_by?.length) {
    query.created_by = filters.created_by.join(',')
  }
  // Booleanos: se envían explícitamente (true/false) una vez que el usuario
  // tocó el switch; si nunca se tocó, la clave no existe y se omite el param.
  if (filters.overdue !== undefined) {
    query.overdue = filters.overdue
  }
  if (filters.completed !== undefined) {
    query.completed = filters.completed
  }
  if (filters.multiple_close !== undefined) {
    query.multiple_close = filters.multiple_close
  }
  // Solo `true` filtra: con `false` el param se omite.
  if (filters.not_started) {
    query.not_started = true
  }
  for (const key of TASK_FILTER_DATE_KEYS) {
    const value = filters[key]
    if (value) {
      query[key] = value
    }
  }
  // «Finalización» solo existe en completadas.
  if (hasFinalDateFilter(filters)) {
    query.completed = true
  }

  return query
}
