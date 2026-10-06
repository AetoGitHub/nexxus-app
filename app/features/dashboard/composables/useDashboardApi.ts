import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type {
  ApiKpisResponse,
  ApiLoadDistributionResponse,
  ApiPeopleResponse,
  ApiProjectsResponse,
} from '~/features/dashboard/types/dashboard-api.types'
import type { DashboardCompare, DashboardDateRange, DashboardPeriod } from '~/features/dashboard/types/dashboard.types'
import { buildDashboardQuery } from '~/features/dashboard/utils/dashboard-filters.util'

export const dashboardQueryKey = ['dashboard'] as const

/** Filtros que comparten los bloques del Dashboard (cada bloque toma los que le aplican). */
export interface DashboardFilters {
  period: MaybeRefOrGetter<DashboardPeriod>
  compare: MaybeRefOrGetter<DashboardCompare>
  /** Rango personalizado válido; reemplaza a `period`. */
  range?: MaybeRefOrGetter<DashboardDateRange | null>
  /** Vista «Mis tareas». */
  myTasks?: MaybeRefOrGetter<boolean>
  /** Temas elegidos; vacío = todos. */
  projectIds?: MaybeRefOrGetter<number[]>
  /** Falso mientras el rango personalizado está a medias: no se pide nada y se conserva lo que había. */
  enabled?: MaybeRefOrGetter<boolean>
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
  query: () => Record<string, string>,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const { $api } = useNuxtApp()
  const { selectedCompanyId } = useAuth()

  const request = useQuery({
    queryKey: computed(() => [...dashboardQueryKey, block, selectedCompanyId.value, query()]),
    queryFn: () => $api<T>(`/api/dashboard/${block}/`, { query: query() }),
    placeholderData: keepPreviousData,
    enabled: computed(() => toValue(enabled)),
  })

  const errorMessage = computed(() =>
    request.error.value ? parseFetchError(request.error.value) : '',
  )

  return { ...request, errorMessage }
}

/** Cabecera TCT y las 5 tarjetas. */
export function useDashboardKpis(filters: DashboardFilters) {
  return useDashboardBlock<ApiKpisResponse>('kpis', () => buildDashboardQuery({
    period: toValue(filters.period),
    compare: toValue(filters.compare),
    range: toValue(filters.range),
    myTasks: toValue(filters.myTasks),
    projectIds: toValue(filters.projectIds),
  }), filters.enabled)
}

/** Distribución de carga productiva. Ignora `compare`: cambiarlo no vuelve a pedirla. */
export function useDashboardLoadDistribution(filters: Omit<DashboardFilters, 'compare'>) {
  return useDashboardBlock<ApiLoadDistributionResponse>('load_distribution', () => buildDashboardQuery({
    period: toValue(filters.period),
    compare: null,
    range: toValue(filters.range),
    myTasks: toValue(filters.myTasks),
    projectIds: toValue(filters.projectIds),
  }), filters.enabled)
}

/**
 * Rendimiento individual: su periodo es propio (el selector de la tabla) y no sigue al rango personalizado; la
 * comparativa, «Mis tareas» y los temas sí son los globales.
 */
export function useDashboardPeople(filters: Omit<DashboardFilters, 'range' | 'enabled'>) {
  return useDashboardBlock<ApiPeopleResponse>('people', () => buildDashboardQuery({
    period: toValue(filters.period),
    compare: toValue(filters.compare),
    myTasks: toValue(filters.myTasks),
    projectIds: toValue(filters.projectIds),
  }))
}

/** Rendimiento por tema. Con el filtro de temas solo regresa esas filas. */
export function useDashboardProjects(filters: DashboardFilters) {
  return useDashboardBlock<ApiProjectsResponse>('projects', () => buildDashboardQuery({
    period: toValue(filters.period),
    compare: toValue(filters.compare),
    range: toValue(filters.range),
    myTasks: toValue(filters.myTasks),
    projectIds: toValue(filters.projectIds),
  }), filters.enabled)
}
