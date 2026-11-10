import type { MaybeRefOrGetter } from 'vue'
import type { ArchivedCounts, TaskCounts, TaskListFilters, TaskSectionKey } from '~/features/tasks/types/task.types'
import { createCompanyTasksApi } from '~/features/tasks/composables/shared/createCompanyTasksApi'
import { useBacklogMine } from '~/features/tasks/composables/shared/useBacklogMine'
import { useRepeatScopeFilter } from '~/features/tasks/composables/shared/useRepeatScopeFilter'
import { fetchTaskListNextPage } from '~/features/tasks/utils/task-infinite.util'

/**
 * Server state del módulo de tareas (vista Lista) vía TanStack Query.
 */
export function useTasks(filters: MaybeRefOrGetter<TaskListFilters> = {}) {
  const api = createCompanyTasksApi(filters)

  const counts = api.countsQuery<TaskCounts>([], '/counts/')
  // «Asignadas a mí» solo afecta al backlog (lista y contador).
  const { extraQuery: backlogMineQuery } = useBacklogMine()
  const backlogCounts = api.countsQuery<ArchivedCounts>(['backlog'], '/backlog/counts/', { extraQuery: backlogMineQuery })
  const backlog = api.listQuery(['backlog'], '/backlog/', { extraQuery: backlogMineQuery })
  const urgent = api.listQuery(['urgent'], '/urgent/')
  const today = api.listQuery(['today'], '/due_today/')
  // Repetitivas de «Próximas»: una por serie por defecto. `repeats` aplica a todas las secciones, por eso el contador de
  // Próximas sale de su propia consulta y no del `counts/` compartido (que también cuenta Hoy y Urgentes).
  const upcomingScope = useRepeatScopeFilter('list-upcoming')
  // Llave propia ('list-upcoming'), no ['upcoming', 'counts']: el realtime inserta tareas en todo lo que empiece con
  // ['tasks', company, 'upcoming'] y trataría este contador como lista (rompía al crear una tarea).
  const upcomingCounts = api.countsQuery<TaskCounts>(['list-upcoming'], '/counts/', { extraQuery: upcomingScope.query })
  const upcoming = api.listQuery(['upcoming'], '/upcoming/', { extraQuery: upcomingScope.query })

  function loadMore(sectionId: TaskSectionKey) {
    const queries = { backlog, urgent, today, upcoming } as const
    fetchTaskListNextPage(queries[sectionId])
  }

  return { counts, upcomingCounts, upcomingScope, backlogCounts, backlog, urgent, today, upcoming, loadMore }
}
