import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type {
  ApiKpisResponse,
  ApiLoadDistributionResponse,
  ApiPeopleExportResponse,
  ApiPeopleResponse,
  ApiProjectsResponse,
} from '~/features/dashboard/types/dashboard-api.types'
import type { DashboardCompare, DashboardDateRange, DashboardPeriod } from '~/features/dashboard/types/dashboard.types'
import type { DashboardListQuery } from '~/features/dashboard/utils/dashboard-filters.util'
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
  /** Proyectos elegidos; vacío = todos. */
  projectIds?: MaybeRefOrGetter<number[]>
  /** Usuario elegido (`user`): recalcula todos los bloques con sus tareas; `null` = todo el equipo. */
  userId?: MaybeRefOrGetter<number | null>
  /** Falso mientras el rango personalizado está a medias: no se pide nada y se conserva lo que había. */
  enabled?: MaybeRefOrGetter<boolean>
}

/** Búsqueda, orden y paginación de una tabla (`people/` y `projects/`). */
export type DashboardTableParams = MaybeRefOrGetter<DashboardListQuery>

/** Filtros globales como los toma `buildDashboardQuery` (sin tabla). */
function globalQuery(filters: DashboardFilters, compare: DashboardCompare | null) {
  return {
    period: toValue(filters.period),
    compare,
    range: toValue(filters.range),
    myTasks: toValue(filters.myTasks),
    projectIds: toValue(filters.projectIds),
    userId: toValue(filters.userId),
  }
}

/**
 * Mensaje de un error del Dashboard. Para 400/403 muestra lo que dice el backend (`detail` o el mensaje del campo, p. ej.
 * «user: Introduzca un número entero válido» o «Se pueden exportar máximo 5,000 filas»), que `parseFetchError` ocultaría
 * en el 403 con un mensaje genérico. El resto de errores sigue el camino de siempre.
 */
export function dashboardErrorMessage(error: unknown): string {
  const failure = error as { status?: number, statusCode?: number, data?: unknown } | null
  const status = failure?.status ?? failure?.statusCode
  const data = failure?.data

  if ((status === 400 || status === 403) && data && typeof data === 'object' && !Array.isArray(data)) {
    const record = data as Record<string, unknown>
    if (typeof record.detail === 'string' && record.detail.trim()) {
      return record.detail
    }
    const fields = Object.values(record)
      .flatMap(value => (Array.isArray(value) ? value : [value]))
      .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
    if (fields.length) {
      return fields.join('. ')
    }
  }
  return parseFetchError(error)
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
    // Un 400/403 (usuario ajeno a la compañía, parámetros inválidos) no se arregla reintentando.
    retry: (failureCount, error) => {
      const status = (error as { status?: number }).status
      return status !== 400 && status !== 403 && failureCount < 3
    },
  })

  const errorMessage = computed(() =>
    request.error.value ? dashboardErrorMessage(request.error.value) : '',
  )

  return { ...request, errorMessage }
}

/** Cabecera TCT y las 5 tarjetas. */
export function useDashboardKpis(filters: DashboardFilters) {
  return useDashboardBlock<ApiKpisResponse>('kpis', () => buildDashboardQuery(
    globalQuery(filters, toValue(filters.compare)),
  ), filters.enabled)
}

/** Distribución de carga productiva. Ignora `compare`: cambiarlo no vuelve a pedirla. */
export function useDashboardLoadDistribution(filters: Omit<DashboardFilters, 'compare'>) {
  return useDashboardBlock<ApiLoadDistributionResponse>('load_distribution', () => buildDashboardQuery(
    globalQuery({ ...filters, compare: 'none' }, null),
  ), filters.enabled)
}

/**
 * Rendimiento individual: sigue los mismos filtros globales (periodo o rango, comparativa, «Mis tareas», proyectos y
 * usuario) y además la búsqueda, el orden y la página de su tabla; la carga pendiente solo cuenta las tareas creadas
 * dentro del rango.
 */
export function useDashboardPeople(filters: DashboardFilters, table: DashboardTableParams) {
  return useDashboardBlock<ApiPeopleResponse>('people', () => buildDashboardQuery({
    ...globalQuery(filters, toValue(filters.compare)),
    list: toValue(table),
  }), filters.enabled)
}

/** Rendimiento por proyecto. Con el filtro de proyectos solo regresa esas filas; con usuario, las métricas son de sus tareas. */
export function useDashboardProjects(filters: DashboardFilters, table: DashboardTableParams) {
  return useDashboardBlock<ApiProjectsResponse>('projects', () => buildDashboardQuery({
    ...globalQuery(filters, toValue(filters.compare)),
    list: toValue(table),
  }), filters.enabled)
}

/**
 * Todas las filas de Rendimiento individual con los filtros y la búsqueda actuales (`export=true`), para el Excel: sin
 * paginar y sin la serie de tendencia. Si el backend se niega (p. ej. más de 5,000 filas) el error trae su mensaje.
 */
export function useDashboardPeopleExport(filters: DashboardFilters, table: DashboardTableParams) {
  const { $api } = useNuxtApp()

  return function fetchAllPeople() {
    const { search, ordering } = toValue(table)
    return $api<ApiPeopleExportResponse>('/api/dashboard/people/', {
      query: buildDashboardQuery({
        ...globalQuery(filters, toValue(filters.compare)),
        list: { search, ordering, exportAll: true },
      }),
    })
  }
}
