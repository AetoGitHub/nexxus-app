import { useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { PaginatedResponse } from '~/shared/types/api.types'
import type { UserDropdown } from '~/features/tasks/types/task.types'
import { extractResults, toRelativeApiUrl } from '~/shared/utils/paginated.util'

/** Tope de páginas por si el backend se comporta raro: 30 páginas ya son cientos de usuarios. */
const MAX_PAGES = 30

/**
 * Todos los usuarios del dropdown (GET /api/tools/dropdown/users/), siguiendo `next` hasta el final. `useUsersDropdown`
 * solo trae la primera página, y el dictado por voz necesita el catálogo completo: si la persona nombrada está en la
 * segunda página, la IA no la puede resolver ni el formulario puede deducir su grupo.
 */
export function useAllUsersDropdown(enabled: MaybeRefOrGetter<boolean> = true) {
  const { $api } = useNuxtApp()

  const query = useQuery({
    queryKey: ['dropdowns', 'users', 'all'],
    queryFn: async () => {
      const byId = new Map<number, UserDropdown>()
      let page = await $api<PaginatedResponse<UserDropdown>>('/api/tools/dropdown/users/')
      extractResults(page).forEach(user => byId.set(user.id, user))

      for (let pages = 1; page?.next && pages < MAX_PAGES; pages += 1) {
        page = await $api<PaginatedResponse<UserDropdown>>(toRelativeApiUrl(page.next))
        extractResults(page).forEach(user => byId.set(user.id, user))
      }
      return [...byId.values()]
    },
    enabled: computed(() => toValue(enabled)),
    staleTime: 5 * 60_000,
  })

  const list = computed(() => query.data.value ?? [])

  return { query, list }
}
