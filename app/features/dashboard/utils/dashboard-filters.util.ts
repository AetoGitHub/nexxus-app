import type { DashboardCompare, DashboardDateRange, DashboardPeriod } from '~/features/dashboard/types/dashboard.types'
import { businessDayKey } from '~/shared/utils/date'

export interface DashboardQueryFilters {
  /** Se ignora cuando hay `range`. */
  period: DashboardPeriod
  /** `null` en los bloques que no comparan (`load_distribution`). */
  compare: DashboardCompare | null
  /** Rango personalizado válido: reemplaza a `period`. */
  range?: DashboardDateRange | null
  /** Vista «Mis tareas» (`my_tasks=true`). */
  myTasks?: boolean
  /** Proyectos elegidos (`project=2,3`); vacío = todos. */
  projectIds?: number[]
  /**
   * Filtro por usuario (`user=<id>`): recalcula todo el dashboard con las tareas de esa persona. Con él no se manda
   * `my_tasks` (el backend responde 400 si van juntos): «Mis tareas» equivale a `user=<mi id>`.
   */
  userId?: number | null
  /** Solo `people/` y `projects/`: búsqueda, orden y paginación de la tabla. */
  list?: DashboardListQuery
}

/** Parámetros de tabla de `people/` y `projects/`. Sin `pageSize` el backend regresa todas las filas. */
export interface DashboardListQuery {
  search?: string
  ordering?: string
  page?: number
  pageSize?: number
  /** `export=true`: todas las filas filtradas, sin paginar y sin `trend.series` (Excel). */
  exportAll?: boolean
}

/**
 * Query string de `GET /api/dashboard/<bloque>/`. No manda `company` (el backend usa la compañía seleccionada del perfil)
 * y solo manda `my_tasks` / `project` cuando hay filtro: sin ellos el backend cuenta todo el equipo y todos los proyectos.
 */
export function buildDashboardQuery(filters: DashboardQueryFilters): Record<string, string> {
  const query: Record<string, string> = {}

  if (filters.range) {
    query.date_start = filters.range.start
    query.date_end = filters.range.end
  }
  else {
    query.period = filters.period
  }

  if (filters.compare) {
    query.compare = filters.compare
  }
  if (filters.userId != null) {
    query.user = String(filters.userId)
  }
  else if (filters.myTasks) {
    query.my_tasks = 'true'
  }
  if (filters.projectIds?.length) {
    query.project = filters.projectIds.join(',')
  }

  const list = filters.list
  if (list) {
    const search = list.search?.trim()
    if (search) {
      query.search = search
    }
    if (list.ordering) {
      query.ordering = list.ordering
    }
    if (list.exportAll) {
      query.export = 'true'
    }
    else if (list.pageSize) {
      query.page_size = String(list.pageSize)
      query.page = String(list.page ?? 1)
    }
  }

  return query
}

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/

/** Años razonables: al escribir un año con el teclado el campo pasa por valores como 0002 o 0202, que no deben pedirse. */
const MIN_DAY = '1990-01-01'
const MAX_DAY = '2100-12-31'

/** Rango completo (los dos días) y con el inicio antes o igual al fin; si no, el backend responde 400. */
export function isValidDateRange(start: string, end: string): boolean {
  return DAY_KEY.test(start) && DAY_KEY.test(end) && start <= end && start >= MIN_DAY && end <= MAX_DAY
}

/** Rango inicial al abrir «Personalizado»: los últimos 7 días contando hoy (hora de CDMX). */
export function defaultCustomRange(now: Date = new Date()): DashboardDateRange {
  const end = businessDayKey(now.toISOString()) ?? ''
  const startDate = new Date(`${end}T00:00:00Z`)
  startDate.setUTCDate(startDate.getUTCDate() - 6)
  return { start: startDate.toISOString().slice(0, 10), end }
}
