import type { InfiniteData } from '@tanstack/vue-query'
import type { PaginatedResponse } from '~/shared/types/api.types'

type MaybePersonal = { is_personal?: boolean }

/**
 * Las tareas de un proyecto privado (`is_personal`) solo existen para su dueño y nunca aparecen en vistas de equipo o de
 * otra persona (por grupo, por proyecto, por usuario, vista total). El backend ya no las manda ahí; esto es la red de
 * seguridad del front por si alguna llegara.
 */
export function withoutPersonalTasks<T extends MaybePersonal>(tasks: T[]): T[] {
  return tasks.some(task => task.is_personal === true)
    ? tasks.filter(task => task.is_personal !== true)
    : tasks
}

/** Lo mismo para las páginas de una lista infinita (`select` de TanStack Query). */
export function withoutPersonalPages<T extends MaybePersonal>(
  data: InfiniteData<PaginatedResponse<T>, string | undefined>,
): InfiniteData<PaginatedResponse<T>, string | undefined> {
  return {
    ...data,
    pages: data.pages.map(page => ({ ...page, results: withoutPersonalTasks(page.results) })),
  }
}
