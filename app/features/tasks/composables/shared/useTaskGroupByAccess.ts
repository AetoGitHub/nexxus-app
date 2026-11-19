import type { TaskGroupBy } from '~/features/tasks/types/task.types'

/**
 * Acceso a las agrupaciones del workspace:
 * - «Ver por: Proyecto» siempre se ofrece (con ver tareas). Su alcance depende de `task.can_view_by_project`:
 *   con él, todos los proyectos de la empresa (`all`); sin él, solo los proyectos privados del usuario (`private`).
 * - «Ver por: Grupo» pide `task.can_view_by_group` (además de ver tareas): sin él la opción no se ofrece, sus
 *   endpoints (`/group/…`) no se llaman (responden 403) y, si era la agrupación elegida, se cae a la vista por defecto.
 * El resto de agrupaciones no tienen permiso propio.
 */
export function useTaskGroupByAccess() {
  const { can } = usePermissions()

  /** Proyectos que muestra «Ver por: Proyecto»: todos los de la empresa o solo los privados del usuario. */
  const projectScope = computed<'all' | 'private'>(() => (can('task', 'view_by_project') ? 'all' : 'private'))

  function isGroupByAllowed(value: TaskGroupBy): boolean {
    if (value === 'project') {
      return can('task', 'view')
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

  return { isGroupByAllowed, deniedGroupBys, projectScope }
}
