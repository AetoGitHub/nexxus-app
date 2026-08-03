import type { TaskGroupBy } from '~/features/tasks/types/task.types'
import type { NewTaskFormInput } from '~/features/tasks/utils/form/task-form.util'

/** Campos del formulario de creación que se pueden preseleccionar desde Kanban/List. */
export type NewTaskFormDefaults = Partial<
  Pick<NewTaskFormInput, 'project' | 'group' | 'assignedTo' | 'dueDate' | 'urgent'>
> & {
  /** Label del grupo cuando se preselecciona sin asignado (Kanban por grupo). */
  groupName?: string
}

function toPositiveId(columnId: string | number): number | null {
  const id = Number(columnId)
  return Number.isFinite(id) && id > 0 ? id : null
}

/** Fecha local YYYY-MM-DD. */
function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Prefill de vencimiento según sección Due (today / tomorrow; resto libre). */
function dueDateForSection(sectionId: string | number): string | undefined {
  if (sectionId === 'today') {
    return formatLocalDate(new Date())
  }
  if (sectionId === 'tomorrow') {
    const date = new Date()
    date.setDate(date.getDate() + 1)
    return formatLocalDate(date)
  }
  return undefined
}

/**
 * Prefills al crear tarea desde una columna/sección según el groupBy activo.
 */
export function buildNewTaskDefaultsFromKanbanColumn(
  groupBy: TaskGroupBy,
  columnId: string | number,
  columnTitle?: string | null,
): NewTaskFormDefaults {
  switch (groupBy) {
    case 'project': {
      const project = toPositiveId(columnId)
      return project != null ? { project } : {}
    }
    case 'user': {
      const userId = toPositiveId(columnId)
      return userId != null ? { assignedTo: [userId] } : {}
    }
    case 'group': {
      const group = toPositiveId(columnId)
      if (group == null) {
        return {}
      }
      const groupName = columnTitle?.trim()
      return groupName ? { group, groupName } : { group }
    }
    case 'due': {
      const dueDate = dueDateForSection(columnId)
      return dueDate != null ? { dueDate } : {}
    }
    case 'all': {
      if (columnId === 'urgent') {
        return { urgent: true }
      }
      if (columnId === 'today') {
        return { dueDate: formatLocalDate(new Date()) }
      }
      // upcoming / pending / resto: sin prefill
      return {}
    }
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
  if (defaults.urgent !== undefined) {
    state.urgent = defaults.urgent
  }
}
