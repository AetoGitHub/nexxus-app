import { useCalendarRealtimeTask } from '~/features/tasks/composables/calendar/useCalendarRealtimeTask'
import { useKanbanRealtimeTask } from '~/features/tasks/composables/kanban/useKanbanRealtimeTask'
import { useListRealtimeTask } from '~/features/tasks/composables/list/useListRealtimeTask'
import type { TaskCalendarPhase } from '~/features/tasks/types/task.types'

/**
 * Ubica una tarea recién creada en la vista/groupBy activos (lista, kanban o
 * calendario) y la inserta en caché sin refetch completo del tablero.
 *
 * Un solo punto de entrada usado por dos llamadores: el socket del tablero
 * (`useTaskChannelSocket`, para la creación hecha por *otro* usuario) y la
 * propia mutación de creación (`useCreateTask`, para la tarea que *este*
 * usuario acaba de crear) — así ninguno de los dos necesita invalidar el
 * árbol `['tasks']` completo para reflejar una sola tarea nueva.
 */
export function useTaskCreatedSync() {
  const {
    insertCreatedTask,
    insertCreatedDueTask,
    insertCreatedProjectTask,
    insertCreatedGroupTask,
    insertCreatedUserTask,
    moveTaskInKanban,
  } = useKanbanRealtimeTask()
  const { refreshCreatedCalendarTask } = useCalendarRealtimeTask()
  const { insertCreatedListTask, moveTaskInList } = useListRealtimeTask()
  const route = useRoute()

  function queryParam(key: string) {
    const value = route.query[key]
    const raw = Array.isArray(value) ? value[0] : value
    return typeof raw === 'string' ? raw : null
  }

  const isTasksKanbanActive = computed(() =>
    route.path === '/tasks' && queryParam('view') === 'kanban',
  )

  const kanbanGroupBy = computed(() => queryParam('groupBy') ?? 'all')

  function resolveCalendarSync(taskPk: number) {
    if (route.path !== '/tasks' || queryParam('view') !== 'calendar') {
      return null
    }

    const groupBy = queryParam('groupBy') ?? 'all'

    if (groupBy === 'project') {
      return insertCreatedProjectTask(taskPk)
    }

    if (groupBy === 'group') {
      return insertCreatedGroupTask(taskPk)
    }

    if (groupBy === 'user') {
      return insertCreatedUserTask(taskPk)
    }

    // Due no aplica al calendario.
    if (groupBy !== 'all') {
      return null
    }

    const year = Number(queryParam('year'))
    const month = Number(queryParam('month'))
    const rawPhase = queryParam('phase')
    const phase: TaskCalendarPhase = rawPhase === 'process' || rawPhase === 'close'
      ? rawPhase
      : 'start'

    if (!Number.isInteger(year) || year < 1 || !Number.isInteger(month) || month < 1 || month > 12) {
      return null
    }

    return refreshCreatedCalendarTask({ year, month }, phase)
  }

  function resolveListSync(taskPk: number) {
    if (route.path !== '/tasks' || queryParam('view') !== 'list') {
      return null
    }

    const groupBy = queryParam('groupBy') ?? 'all'

    if (groupBy === 'due') {
      return insertCreatedDueTask(taskPk)
    }

    if (groupBy === 'project') {
      return insertCreatedProjectTask(taskPk)
    }

    if (groupBy === 'group') {
      return insertCreatedGroupTask(taskPk)
    }

    if (groupBy === 'user') {
      return insertCreatedUserTask(taskPk)
    }

    // Estado usa las mismas columnas/caché que el Kanban (groupBy = all).
    if (groupBy === 'status') {
      return insertCreatedTask(taskPk)
    }

    return groupBy === 'all' ? insertCreatedListTask(taskPk) : null
  }

  /**
   * Intenta insertar la tarea `taskPk` en la vista/groupBy activos.
   * Devuelve `false` si la vista actual no la muestra (p. ej. otra pantalla,
   * otro groupBy) — en ese caso no hay nada visible que actualizar.
   */
  async function syncCreatedTask(taskPk: number): Promise<boolean> {
    const calendarSync = resolveCalendarSync(taskPk)
    if (calendarSync) {
      return calendarSync
    }

    const listSync = resolveListSync(taskPk)
    if (listSync) {
      return listSync
    }

    if (!isTasksKanbanActive.value) {
      return false
    }

    if (kanbanGroupBy.value === 'due') {
      return insertCreatedDueTask(taskPk)
    }

    if (kanbanGroupBy.value === 'project') {
      return insertCreatedProjectTask(taskPk)
    }

    if (kanbanGroupBy.value === 'group') {
      return insertCreatedGroupTask(taskPk)
    }

    if (kanbanGroupBy.value === 'user') {
      return insertCreatedUserTask(taskPk)
    }

    if (kanbanGroupBy.value === 'all') {
      return insertCreatedTask(taskPk)
    }

    return false
  }

  /**
   * La tarea `taskPk` cambió de status (iniciar/cerrar/rechazar/reabrir):
   * a diferencia de `syncCreatedTask`, hay que sacarla de la columna/sección
   * donde estaba además de insertarla en la nueva. Solo cubre las vistas
   * agrupadas por status (Kanban "Todas" y Lista "Todas"/"Estado", que
   * comparten caché con el Kanban) — el resto de agrupaciones (proyecto,
   * grupo, usuario, vencimiento, calendario) siguen sin lógica de "mover"
   * dedicada; el llamador debe caer a un invalidate acotado en esos casos.
   */
  async function syncMovedTask(taskPk: number): Promise<boolean> {
    if (route.path === '/tasks' && queryParam('view') === 'list') {
      const groupBy = queryParam('groupBy') ?? 'all'
      if (groupBy === 'status') {
        return moveTaskInKanban(taskPk)
      }
      if (groupBy === 'all') {
        return moveTaskInList(taskPk)
      }
      return false
    }

    if (isTasksKanbanActive.value && kanbanGroupBy.value === 'all') {
      return moveTaskInKanban(taskPk)
    }

    return false
  }

  return { syncCreatedTask, syncMovedTask }
}
