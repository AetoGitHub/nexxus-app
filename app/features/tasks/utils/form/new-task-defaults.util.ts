import type { TaskGroupBy } from '~/features/tasks/types/task.types'
import type { NewTaskFormInput } from '~/features/tasks/utils/form/task-form.util'

/** Campos del formulario de creación que se pueden preseleccionar desde Kanban. */
export type NewTaskFormDefaults = Partial<
  Pick<NewTaskFormInput, 'project' | 'group' | 'assignedTo' | 'dueDate'>
>

function toPositiveId(columnId: string | number): number | null {
  const id = Number(columnId)
  return Number.isFinite(id) && id > 0 ? id : null
}

/**
 * Prefills al crear tarea desde una columna Kanban según el groupBy activo.
 * Hoy solo aplica `project`; el resto queda listo para extender.
 */
export function buildNewTaskDefaultsFromKanbanColumn(
  groupBy: TaskGroupBy,
  columnId: string | number,
): NewTaskFormDefaults {
  switch (groupBy) {
    case 'project': {
      const project = toPositiveId(columnId)
      return project != null ? { project } : {}
    }
    // Futuro: user → assignedTo, group → group, due → dueDate
    case 'user':
    case 'group':
    case 'due':
    case 'all':
    default:
      return {}
  }
}

/** Aplica solo las claves definidas sobre el estado del formulario. */
export function applyNewTaskFormDefaults(
  state: NewTaskFormInput,
  defaults: NewTaskFormDefaults | null | undefined,
): void {
  if (!defaults) {
    return
  }
  if (defaults.project !== undefined) {
    state.project = defaults.project
  }
  if (defaults.group !== undefined) {
    state.group = defaults.group
  }
  if (defaults.assignedTo !== undefined) {
    state.assignedTo = [...defaults.assignedTo]
  }
  if (defaults.dueDate !== undefined) {
    state.dueDate = defaults.dueDate
  }
}
