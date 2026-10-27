import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { PaginatedResponse } from '~/shared/types/api.types'
import type { SavedTaskFilter, SavedTaskFilterPayload } from '~/features/tasks/types/task.types'

const SAVED_FILTERS_PATH = '/api/auth/profiles/filters/'

export const savedTaskFiltersQueryKey = ['auth', 'saved-task-filters'] as const

/**
 * Filtros de tareas guardados del usuario. Los errores 400 del backend (nombre repetido, llave desconocida, fecha
 * inválida) ya vienen en español: se relanzan para que quien llama los muestre junto al formulario.
 */
export function useSavedTaskFilters(enabled: MaybeRefOrGetter<boolean> = true) {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()

  const savedFiltersQuery = useQuery({
    queryKey: savedTaskFiltersQueryKey,
    queryFn: () => $api<PaginatedResponse<SavedTaskFilter>>(SAVED_FILTERS_PATH),
    enabled: computed(() => toValue(enabled)),
  })

  const savedFilters = computed(() => savedFiltersQuery.data.value?.results ?? [])
  const defaultFilter = computed(() => savedFilters.value.find(filter => filter.is_default) ?? null)

  /** Solo puede haber un predeterminado: se recarga la lista para reflejar el cambio del resto. */
  function refresh() {
    return queryClient.invalidateQueries({ queryKey: savedTaskFiltersQueryKey })
  }

  const createMutation = useMutation({
    mutationFn: (payload: Required<Pick<SavedTaskFilterPayload, 'name' | 'params'>> & SavedTaskFilterPayload) =>
      $api<SavedTaskFilter>(`${SAVED_FILTERS_PATH}create/`, { method: 'POST', body: payload }),
    onSuccess: refresh,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }: SavedTaskFilterPayload & { id: number }) =>
      $api<SavedTaskFilter>(`${SAVED_FILTERS_PATH}${id}/update/`, { method: 'PATCH', body: payload }),
    onSuccess: refresh,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      $api(`${SAVED_FILTERS_PATH}${id}/delete/`, { method: 'DELETE' }),
    onSuccess: refresh,
  })

  return {
    savedFiltersQuery,
    savedFilters,
    defaultFilter,
    createMutation,
    updateMutation,
    deleteMutation,
  }
}
