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
  if (filters.type) {
    query.type = filters.type
  }
  if (filters.project?.length) {
    query.project = filters.project.join(',')
  }
  if (filters.overdue) {
    query.overdue = true
  }
  if (filters.completed) {
    query.completed = true
  }
  if (filters.multiple_close) {
    query.multiple_close = true
  }

  return query
}
