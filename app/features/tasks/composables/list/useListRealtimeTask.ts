import type { InfiniteData } from '@tanstack/vue-query'
import { useQueryClient } from '@tanstack/vue-query'
import type { Task, TaskCounts } from '~/features/tasks/types/task.types'
import type { PaginatedResponse } from '~/shared/types/api.types'
import { prependTaskToInfiniteData, removeTaskFromInfiniteData } from '~/features/tasks/utils/task-infinite.util'

const REALTIME_LIST_SECTIONS = [
  {
    cacheId: 'urgent',
    countKey: 'urgent',
    path: '/urgent/',
  },
  {
    cacheId: 'today',
    countKey: 'due_today',
    path: '/due_today/',
  },
  {
    cacheId: 'upcoming',
    countKey: 'tasks',
    path: '/upcoming/',
  },
] as const

type ListCountKey = typeof REALTIME_LIST_SECTIONS[number]['countKey']

/** Inserta una tarea creada en todas las secciones coincidentes de Lista. */
export function useListRealtimeTask() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const { selectedCompanyId: companyId } = useAuth()
  const { adminQuery } = useTaskAdminView()

  async function insertCreatedListTask(taskPk: number): Promise<boolean> {
    if (companyId.value == null) {
      return false
    }

    const responses = await Promise.all(
      REALTIME_LIST_SECTIONS.map(async section => ({
        ...section,
        data: await $api<PaginatedResponse<Task>>(
          `/api/tasks/company/${companyId.value}${section.path}`,
          { query: { pk: taskPk, ...adminQuery.value } },
        ),
      })),
    )

    const matches = responses.flatMap((response) => {
      const task = response.data.results[0]
      return task ? [{ ...response, task }] : []
    })

    if (!matches.length) {
      return false
    }

    const insertedCounts = new Set<ListCountKey>()

    for (const match of matches) {
      queryClient.setQueriesData<InfiniteData<PaginatedResponse<Task>> | PaginatedResponse<Task>>(
        {
          queryKey: ['tasks', companyId.value, match.cacheId],
          type: 'active',
        },
        (current) => {
          const next = prependTaskToInfiniteData(current, match.task)
          if (next !== current) {
            insertedCounts.add(match.countKey)
          }
          return next
        },
      )
    }

    if (insertedCounts.size) {
      queryClient.setQueriesData<TaskCounts>(
        {
          queryKey: ['tasks', companyId.value, 'counts'],
          type: 'active',
        },
        (current) => {
          if (!current) {
            return current
          }

          const next = { ...current }
          for (const countKey of insertedCounts) {
            next[countKey] += 1
          }
          return next
        },
      )
    }

    return true
  }

  /** Quita la tarea de las 3 secciones (urgent/today/upcoming), decrementando sus contadores. */
  function removeTaskFromListSections(taskId: number) {
    if (companyId.value == null) {
      return
    }

    const decrementedCounts = new Set<ListCountKey>()

    for (const section of REALTIME_LIST_SECTIONS) {
      queryClient.setQueriesData<InfiniteData<PaginatedResponse<Task>> | PaginatedResponse<Task>>(
        {
          queryKey: ['tasks', companyId.value, section.cacheId],
          type: 'active',
        },
        (current) => {
          const next = removeTaskFromInfiniteData(current, taskId)
          if (next !== current) {
            decrementedCounts.add(section.countKey)
          }
          return next
        },
      )
    }

    if (decrementedCounts.size) {
      queryClient.setQueriesData<TaskCounts>(
        { queryKey: ['tasks', companyId.value, 'counts'], type: 'active' },
        (current) => {
          if (!current) {
            return current
          }
          const next = { ...current }
          for (const countKey of decrementedCounts) {
            next[countKey] = Math.max(0, next[countKey] - 1)
          }
          return next
        },
      )
    }
  }

  /**
   * La tarea `taskPk` cambió de status: la saca de la sección de Lista en
   * la que estuviera y la reinserta en la que le corresponde ahora.
   */
  async function moveTaskInList(taskPk: number): Promise<boolean> {
    removeTaskFromListSections(taskPk)
    return insertCreatedListTask(taskPk)
  }

  return { insertCreatedListTask, moveTaskInList }
}
