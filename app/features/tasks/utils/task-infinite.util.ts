import { infiniteQueryOptions, type InfiniteData } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { PaginatedResponse } from '~/shared/types/api.types'
import type { Task } from '~/features/tasks/types/task.types'
import { getPaginatedNextPageParam } from '~/shared/utils/paginated.util'

type TaskListApi = <T>(
  url: string,
  options?: { query?: Record<string, string | number | boolean> },
) => Promise<T>

/** Opciones de infinite query para un listado de tareas paginado. */
export function taskListInfiniteQueryOptions(args: {
  $api: TaskListApi
  queryKey: unknown[]
  url: string
  query: Record<string, string | number | boolean>
  enabled: boolean
}) {
  return infiniteQueryOptions({
    queryKey: args.queryKey,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      pageParam
        ? args.$api<PaginatedResponse<Task>>(pageParam)
        : args.$api<PaginatedResponse<Task>>(args.url, { query: args.query }),
    getNextPageParam: getPaginatedNextPageParam<Task>,
    enabled: args.enabled,
  })
}

function isInfiniteTaskData(
  data: unknown,
): data is InfiniteData<PaginatedResponse<Task>> {
  return !!data
    && typeof data === 'object'
    && 'pages' in data
    && Array.isArray((data as InfiniteData<PaginatedResponse<Task>>).pages)
}

/** Pide la siguiente página si el infinite query aún tiene `next`. */
export function fetchTaskListNextPage(query: {
  hasNextPage?: MaybeRefOrGetter<boolean | undefined>
  isFetchingNextPage?: MaybeRefOrGetter<boolean | undefined>
  fetchNextPage?: () => unknown
}) {
  if (!toValue(query.hasNextPage) || toValue(query.isFetchingNextPage)) {
    return
  }
  void query.fetchNextPage?.()
}

/**
 * Inserta una tarea al inicio de la primera página (caché infinite).
 * Si no hay caché y `seedIfMissing`, crea la primera página.
 */
export function prependTaskToInfiniteData(
  current: InfiniteData<PaginatedResponse<Task>> | PaginatedResponse<Task> | undefined,
  task: Task,
  seedIfMissing = false,
): InfiniteData<PaginatedResponse<Task>> | PaginatedResponse<Task> | undefined {
  if (!current) {
    if (!seedIfMissing) {
      return current
    }
    return {
      pages: [{ next: null, previous: null, count: 1, results: [task] }],
      pageParams: [undefined],
    }
  }

  if (isInfiniteTaskData(current)) {
    if (current.pages.some(page => page.results.some(item => item.id === task.id))) {
      return current
    }

    const [first, ...rest] = current.pages
    if (!first) {
      return {
        ...current,
        pages: [{ next: null, previous: null, count: 1, results: [task] }],
      }
    }

    return {
      ...current,
      pages: [
        {
          ...first,
          count: first.count == null ? undefined : first.count + 1,
          results: [task, ...first.results],
        },
        ...rest,
      ],
    }
  }

  if (current.results.some(item => item.id === task.id)) {
    return current
  }

  return {
    ...current,
    count: current.count == null ? undefined : current.count + 1,
    results: [task, ...current.results],
  }
}
