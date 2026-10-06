import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type {
  ApiKpisResponse,
  ApiLoadDistributionResponse,
  ApiPeopleResponse,
  ApiProjectsResponse,
} from '~/features/dashboard/types/dashboard-api.types'
import type { DashboardCompare, DashboardPeriod } from '~/features/dashboard/types/dashboard.types'

export const dashboardQueryKey = ['dashboard'] as const

interface DashboardFilters {
  period: MaybeRefOrGetter<DashboardPeriod>
  compare: MaybeRefOrGetter<DashboardCompare>
}

/**
 * Consulta de un bloque del Dashboard (`GET /api/dashboard/<block>/`).
 *
 * Cada bloque pide lo suyo y carga por separado. No se manda `company`: el backend usa la compañía seleccionada del
 * perfil, pero va en la llave para que al cambiar de compañía se vuelva a pedir. Mientras llegan datos nuevos se
 * conserva lo anterior (`isPlaceholderData`) para que la pantalla no parpadee al cambiar un filtro.
 */
function useDashboardBlock<T>(
  block: string,
  filters: MaybeRefOrGetter<Record<string, string>>,
) {
  const { $api } = useNuxtApp()
  const { selectedCompanyId } = useAuth()

  const query = useQuery({
    queryKey: computed(() => [...dashboardQueryKey, block, selectedCompanyId.value, toValue(filters)]),
    queryFn: () => $api<T>(`/api/dashboard/${block}/`, { query: toValue(filters) }),
    placeholderData: keepPreviousData,
  })

  const errorMessage = computed(() =>
    query.error.value ? parseFetchError(query.error.value) : '',
  )

  return { ...query, errorMessage }
}

/** Cabecera TCT y las 5 tarjetas. */
export function useDashboardKpis({ period, compare }: DashboardFilters) {
  return useDashboardBlock<ApiKpisResponse>('kpis', () => ({
    period: toValue(period),
    compare: toValue(compare),
  }))
}

/** Distribución de carga productiva. Ignora `compare`: cambiarlo no vuelve a pedirla. */
export function useDashboardLoadDistribution({ period }: Pick<DashboardFilters, 'period'>) {
  return useDashboardBlock<ApiLoadDistributionResponse>('load_distribution', () => ({
    period: toValue(period),
  }))
}

/** Rendimiento individual: su periodo es propio (el selector de la tabla), la comparativa es la global. */
export function useDashboardPeople({ period, compare }: DashboardFilters) {
  return useDashboardBlock<ApiPeopleResponse>('people', () => ({
    period: toValue(period),
    compare: toValue(compare),
  }))
}

/** Rendimiento por tema. */
export function useDashboardProjects({ period, compare }: DashboardFilters) {
  return useDashboardBlock<ApiProjectsResponse>('projects', () => ({
    period: toValue(period),
    compare: toValue(compare),
  }))
}
