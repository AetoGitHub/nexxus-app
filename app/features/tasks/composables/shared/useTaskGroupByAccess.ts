import type { TaskGroupBy } from '~/features/tasks/types/task.types'

/**
 * «Ver por: Proyecto / Grupo» piden su permiso (`task.can_view_by_project` / `task.can_view_by_group`, además de ver
 * tareas): sin él la opción no se ofrece, sus endpoints (`/project/…`, `/group/…`) no se llaman (responden 403) y, si
 * era la agrupación elegida, se cae a la vista por defecto. El resto de agrupaciones no tienen permiso propio.
 */
export function useTaskGroupByAccess() {
  const { can } = usePermissions()

  function isGroupByAllowed(value: TaskGroupBy): boolean {
    if (value === 'project') {
      return can('task', 'view') && can('task', 'view_by_project')
    }
    if (value === 'group') {
      return can('task', 'view') && can('task', 'view_by_group')
    }
    return true
  }

  /** Agrupaciones que el usuario no puede usar (para ocultarlas del selector). */
  const deniedGroupBys = computed<TaskGroupBy[]>(() =>
    (['project', 'group'] as TaskGroupBy[]).filter(value => !isGroupByAllowed(value)),
  )

  return { isGroupByAllowed, deniedGroupBys }
}
