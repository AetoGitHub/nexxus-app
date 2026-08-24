import { useQueryClient } from '@tanstack/vue-query'
import { CURRENT_TASKS_COMPANY_ID } from '~/features/tasks/composables/shared/createCompanyTasksApi'
import type { Task, TaskCounts } from '~/features/tasks/types/task.types'
import type { PaginatedResponse } from '~/shared/types/api.types'

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

  async function insertCreatedListTask(taskPk: number): Promise<boolean> {
    const responses = await Promise.all(
      REALTIME_LIST_SECTIONS.map(async section => ({
        ...section,
        data: await $api<PaginatedResponse<Task>>(
          `/api/tasks/company/${CURRENT_TASKS_COMPANY_ID}${section.path}`,
          { query: { pk: taskPk } },
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
      queryClient.setQueriesData<PaginatedResponse<Task>>(
        {
          queryKey: ['tasks', CURRENT_TASKS_COMPANY_ID, match.cacheId],
          type: 'active',
        },
        (current) => {
          if (!current || current.results.some(task => task.id === match.task.id)) {
            return current
          }

          insertedCounts.add(match.countKey)
          return {
            ...current,
            count: current.count == null ? undefined : current.count + 1,
            results: [match.task, ...current.results],
          }
        },
      )
    }

    if (insertedCounts.size) {
      queryClient.setQueriesData<TaskCounts>(
        {
          queryKey: ['tasks', CURRENT_TASKS_COMPANY_ID, 'counts'],
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

  return { insertCreatedListTask }
}
