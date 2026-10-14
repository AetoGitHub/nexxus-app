import type { WatchSource } from 'vue'
import type { DashboardListQuery } from '~/features/dashboard/utils/dashboard-filters.util'

/** Filas por página de las tablas del Dashboard (el backend admite de 1 a 100). */
export const DASHBOARD_PAGE_SIZE = 25

interface DashboardTableStateOptions {
  /** Orden inicial (`campo` ascendente, `-campo` descendente); el backend usa `-tct` si no se manda. */
  defaultOrdering: string
  /** Cambios que mandan la tabla a la página 1 (usuario, periodo, comparativa, alcance, proyectos...). */
  resetOn: WatchSource[]
}

/**
 * Estado de una tabla del Dashboard con búsqueda y paginación en el servidor: lo que se escribe en el buscador, el orden
 * y la página, y los parámetros que se mandan al backend.
 *
 * - La búsqueda se manda ~300 ms después de dejar de teclear; `search` es lo escrito y `params.search` lo ya enviado.
 * - La página vuelve a 1 al cambiar la búsqueda, el orden o cualquiera de `resetOn`. El observador es síncrono para que
 *   la consulta nunca salga con el filtro nuevo y la página vieja.
 */
export function useDashboardTableState(options: DashboardTableStateOptions) {
  const search = ref('')
  const settledSearch = refDebounced(search, 300)
  const ordering = ref(options.defaultOrdering)
  const page = ref(1)

  watch([settledSearch, ordering, ...options.resetOn], () => {
    page.value = 1
  }, { flush: 'sync' })

  const params = computed<DashboardListQuery>(() => ({
    search: settledSearch.value.trim(),
    ordering: ordering.value,
    page: page.value,
    pageSize: DASHBOARD_PAGE_SIZE,
  }))

  /** Borra búsqueda y orden y vuelve a la primera página (p. ej. al cambiar de compañía). */
  function reset() {
    search.value = ''
    ordering.value = options.defaultOrdering
    page.value = 1
  }

  return { search, ordering, page, params, reset }
}

/**
 * Orden al pulsar el encabezado de una columna: si ya se ordena por ella se invierte; si no, arranca en la dirección
 * que tiene sentido para esa métrica (mejor primero: los porcentajes y conteos de mayor a menor; el nombre y el TPR, donde
 * menor es mejor, de menor a mayor).
 */
export function nextOrdering(current: string, field: string, ascendingFirst: boolean): string {
  if (current === field) {
    return `-${field}`
  }
  if (current === `-${field}`) {
    return field
  }
  return ascendingFirst ? field : `-${field}`
}
