import type { TaskListFilters } from '~/features/tasks/types/task.types'

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

  return query
}
