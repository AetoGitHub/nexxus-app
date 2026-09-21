import { useQueryClient, type InfiniteData } from '@tanstack/vue-query'
import type {
  AssignedTaskCount,
  KanbanCounts,
  OverdueCounts,
  ProjectDropdown,
  ProjectTaskCount,
  Task,
  TaskGroupCount,
  TaskGroupListItem,
  UserDropdown,
} from '~/features/tasks/types/task.types'
import type { PaginatedResponse } from '~/shared/types/api.types'
import { extractResults } from '~/shared/utils/paginated.util'
import { prependTaskToInfiniteData, removeTaskFromInfiniteData } from '~/features/tasks/utils/task-infinite.util'

const REALTIME_KANBAN_COLUMNS = [
  { id: 'pending', path: '/kanban/pending/' },
  { id: 'wip', path: '/kanban/wip/' },
  { id: 'in_review', path: '/kanban/in_review/' },
  { id: 'complete', path: '/kanban/complete/' },
] as const

const REALTIME_DUE_COLUMNS = [
  { id: 'today', path: '/overdue/today/' },
  { id: 'tomorrow', path: '/overdue/tomorrow/' },
  { id: 'week', path: '/overdue/week/' },
  { id: 'month', path: '/overdue/month/' },
] as const

type RealtimeKanbanColumnId = typeof REALTIME_KANBAN_COLUMNS[number]['id']
type RealtimeDueColumnId = typeof REALTIME_DUE_COLUMNS[number]['id']

/**
 * Localiza una tarea creada en las columnas del Kanban activo y la inserta
 * en la caché sin recargar el tablero completo.
 */
export function useKanbanRealtimeTask() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const { selectedCompanyId: companyId } = useAuth()
  const { adminQuery } = useTaskAdminView()

  async function locateCreatedTasks<TColumnId extends string | number>(
    columns: ReadonlyArray<{ id: TColumnId, path: string }>,
    taskPk: number,
  ) {
    if (companyId.value == null) {
      return []
    }

    const responses = await Promise.all(
      columns.map(async column => ({
        columnId: column.id,
        data: await $api<PaginatedResponse<Task>>(
          `/api/tasks/company/${companyId.value}${column.path}`,
          { query: { pk: taskPk, ...adminQuery.value } },
        ),
      })),
    )

    return responses.flatMap((response) => {
      const task = response.data.results[0]
      return task ? [{ columnId: response.columnId, task }] : []
    })
  }

  async function locateCreatedTask<TColumnId extends string | number>(
    columns: ReadonlyArray<{ id: TColumnId, path: string }>,
    taskPk: number,
  ) {
    const matches = await locateCreatedTasks(columns, taskPk)
    return matches[0] ?? null
  }

  function prependTaskToActiveList(
    scope: Array<string | number>,
    columnId: string | number,
    task: Task,
    options: { seedIfMissing?: boolean } = {},
  ) {
    let inserted = false

    queryClient.setQueriesData<InfiniteData<PaginatedResponse<Task>> | PaginatedResponse<Task>>(
      {
        queryKey: ['tasks', companyId.value, ...scope, columnId],
        type: options.seedIfMissing ? 'all' : 'active',
      },
      (current) => {
        const next = prependTaskToInfiniteData(current, task, options.seedIfMissing)
        if (next !== current) {
          inserted = true
        }
        return next
      },
    )

    return inserted
  }

  function incrementKanbanCounts(columnId: RealtimeKanbanColumnId) {
    queryClient.setQueriesData<KanbanCounts>(
      {
        queryKey: ['tasks', companyId.value, 'kanban', 'counts'],
        type: 'active',
      },
      current => current
        ? {
            ...current,
            [columnId]: current[columnId] + 1,
            total: current.total == null ? undefined : current.total + 1,
          }
        : current,
    )
  }

  function decrementKanbanCounts(columnId: RealtimeKanbanColumnId) {
    queryClient.setQueriesData<KanbanCounts>(
      {
        queryKey: ['tasks', companyId.value, 'kanban', 'counts'],
        type: 'active',
      },
      current => current
        ? {
            ...current,
            [columnId]: Math.max(0, current[columnId] - 1),
            total: current.total == null ? undefined : Math.max(0, current.total - 1),
          }
        : current,
    )
  }

  /**
   * Quita una tarea de cualquier columna del Kanban activo donde esté (sin
   * saber de antemano cuál), decrementando el contador de esa columna.
   * Usado cuando la tarea cambia de status: ya no basta con insertarla en
   * la nueva columna, también hay que sacarla de la anterior. Recorre las
   * 4 columnas explícitamente para no tocar la query de `counts`, que
   * comparte el mismo prefijo de caché.
   */
  function removeTaskFromKanbanColumns(taskId: number) {
    for (const column of REALTIME_KANBAN_COLUMNS) {
      const matches = queryClient.getQueriesData<InfiniteData<PaginatedResponse<Task>> | PaginatedResponse<Task>>({
        queryKey: ['tasks', companyId.value, 'kanban', column.id],
        type: 'active',
      })

      for (const [queryKey, data] of matches) {
        if (!data) {
          continue
        }
        const next = removeTaskFromInfiniteData(data, taskId)
        if (next === data) {
          continue
        }
        queryClient.setQueryData(queryKey, next)
        decrementKanbanCounts(column.id)
      }
    }
  }

  function incrementDueCounts(columnId: RealtimeDueColumnId) {
    queryClient.setQueriesData<OverdueCounts>(
      {
        queryKey: ['tasks', companyId.value, 'overdue', 'counts'],
        type: 'active',
      },
      current => current
        ? {
            ...current,
            [columnId]: current[columnId] + 1,
          }
        : current,
    )
  }

  async function insertCreatedTask(taskPk: number): Promise<boolean> {
    const match = await locateCreatedTask(REALTIME_KANBAN_COLUMNS, taskPk)
    if (!match) {
      return false
    }

    if (prependTaskToActiveList(['kanban'], match.columnId, match.task)) {
      incrementKanbanCounts(match.columnId)
    }

    return true
  }

  /**
   * La tarea `taskPk` cambió de status (iniciar/cerrar/rechazar/reabrir):
   * la saca de la columna en la que estuviera y la reinserta en la que le
   * corresponde ahora, sin refetchear el tablero completo.
   */
  async function moveTaskInKanban(taskPk: number): Promise<boolean> {
    removeTaskFromKanbanColumns(taskPk)
    return insertCreatedTask(taskPk)
  }

  async function insertCreatedDueTask(taskPk: number): Promise<boolean> {
    const match = await locateCreatedTask(REALTIME_DUE_COLUMNS, taskPk)
    if (!match) {
      return false
    }

    if (prependTaskToActiveList(['overdue'], match.columnId, match.task)) {
      incrementDueCounts(match.columnId)
    }

    return true
  }

  function incrementNamedCounts(
    scope: Array<string | number>,
    entityId: number,
    entityName: string,
  ) {
    queryClient.setQueriesData<Array<ProjectTaskCount | TaskGroupCount>>(
      {
        queryKey: ['tasks', companyId.value, ...scope],
        type: 'active',
      },
      (current) => {
        if (!current) {
          return current
        }

        const exists = current.some(item => item.id === entityId)
        if (!exists) {
          return [...current, { id: entityId, name: entityName, total: 1 }]
        }

        return current.map(item =>
          item.id === entityId
            ? { ...item, total: item.total + 1 }
            : item,
        )
      },
    )
  }

  async function insertCreatedProjectTask(taskPk: number): Promise<boolean> {
    if (companyId.value == null) {
      return false
    }

    const projects = await queryClient.ensureQueryData({
      queryKey: ['dropdowns', 'projects', companyId.value],
      queryFn: () =>
        $api<PaginatedResponse<ProjectDropdown>>(
          `/api/tools/dropdown/projects/company/${companyId.value}/`,
        ),
    })

    const columns = extractResults(projects).map(project => ({
      id: project.id,
      path: `/project/${project.id}/`,
      name: project.name,
    }))

    if (!columns.length) {
      return false
    }

    const match = await locateCreatedTask(columns, taskPk)
    if (!match) {
      return false
    }

    const projectName = columns.find(column => column.id === match.columnId)?.name ?? ''

    if (prependTaskToActiveList(['project'], match.columnId, match.task, { seedIfMissing: true })) {
      incrementNamedCounts(['project', 'counts'], Number(match.columnId), projectName)
    }

    return true
  }

  async function insertCreatedGroupTask(taskPk: number): Promise<boolean> {
    if (companyId.value == null) {
      return false
    }

    const groups = await queryClient.ensureQueryData({
      queryKey: ['tasks', companyId.value, 'groups', 'list'],
      queryFn: () =>
        $api<PaginatedResponse<TaskGroupListItem>>(
          `/api/tasks/company/${companyId.value}/groups/`,
        ),
    })

    const columns = extractResults(groups).map(group => ({
      id: group.id,
      path: `/group/${group.id}/`,
      name: group.name,
    }))

    if (!columns.length) {
      return false
    }

    const match = await locateCreatedTask(columns, taskPk)
    if (!match) {
      return false
    }

    const groupName = columns.find(column => column.id === match.columnId)?.name ?? ''

    if (prependTaskToActiveList(['group'], match.columnId, match.task, { seedIfMissing: true })) {
      incrementNamedCounts(['group', 'counts'], Number(match.columnId), groupName)
    }

    return true
  }

  function incrementAssignedCounts(userId: number, username: string) {
    queryClient.setQueriesData<AssignedTaskCount[]>(
      {
        queryKey: ['tasks', companyId.value, 'assigned', 'counts'],
        type: 'active',
      },
      (current) => {
        if (!current) {
          return current
        }

        const exists = current.some(item => item.id === userId)
        if (!exists) {
          return [...current, { id: userId, username, total: 1 }]
        }

        return current.map(item =>
          item.id === userId
            ? { ...item, total: item.total + 1 }
            : item,
        )
      },
    )
  }

  async function insertCreatedUserTask(taskPk: number): Promise<boolean> {
    const users = await queryClient.ensureQueryData({
      queryKey: ['dropdowns', 'users'],
      queryFn: () =>
        $api<PaginatedResponse<UserDropdown>>('/api/tools/dropdown/users/'),
    })

    const columns = extractResults(users).map(user => ({
      id: user.id,
      path: `/assigned/${user.id}/`,
      username: user.username,
    }))

    if (!columns.length) {
      return false
    }

    const matches = await locateCreatedTasks(columns, taskPk)
    if (!matches.length) {
      return false
    }

    for (const match of matches) {
      const username = columns.find(column => column.id === match.columnId)?.username ?? ''

      if (prependTaskToActiveList(['assigned'], match.columnId, match.task, { seedIfMissing: true })) {
        incrementAssignedCounts(Number(match.columnId), username)
      }
    }

    return true
  }

  return {
    insertCreatedTask,
    insertCreatedDueTask,
    insertCreatedProjectTask,
    insertCreatedGroupTask,
    insertCreatedUserTask,
    moveTaskInKanban,
  }
}
