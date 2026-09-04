import type { KanbanColumn, Task } from '~/features/tasks/types/task.types'

/** Fuente mínima para armar una columna Kanban. */
export interface KanbanSectionSource {
  id: string | number
  name?: string
  labelKey?: string
  color?: string
  dotColor?: string
  count?: number
  tasks: Task[]
  loading: boolean
  error: boolean
  comingSoon?: boolean
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
}

/** Normaliza secciones de lista al contrato Kanban. */
export function sectionsToKanbanColumns(sections: KanbanSectionSource[]): KanbanColumn[] {
  return sections.map(section => ({
    id: section.id,
    title: section.name,
    labelKey: section.labelKey,
    color: section.color ?? section.dotColor ?? '#6b7280',
    count: section.count,
    tasks: section.tasks,
    loading: section.loading,
    error: section.error,
    comingSoon: section.comingSoon,
    hasNextPage: section.hasNextPage,
    isFetchingNextPage: section.isFetchingNextPage,
  }))
}
