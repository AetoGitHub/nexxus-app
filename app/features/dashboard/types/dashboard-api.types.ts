/** Respuestas de `GET /api/dashboard/*` (kpis, load_distribution, people, projects). */

/** `custom` solo viene en las respuestas: es el rango personalizado (`date_start`/`date_end`). */
export type DashboardApiPeriod = 'week' | 'month' | 'quarter' | 'year' | 'custom'

export type DashboardApiCompare = 'none' | 'previous' | 'last_year'

export type ApiDirection = 'up' | 'down' | 'flat' | null

export type ApiRange = 'excellent' | 'good' | 'regular' | 'critical'

export type ApiLoadStatus = 'available' | 'at_limit' | 'saturated'

/** `start` = `YYYY-MM-DD`; `value` es `null` cuando el tramo no tiene datos. */
export interface ApiTrendPoint {
  start: string
  value: number | null
}

export interface ApiPeriodInfo {
  start: string
  end: string
  compare_start: string | null
  compare_end: string | null
  period: DashboardApiPeriod
  compare: DashboardApiCompare
}

export interface ApiKpi {
  value: number | null
  /** TPR siempre viene en `null` (menor es mejor). */
  goal: number | null
  previous: number | null
  /** `value - previous`. */
  delta: number | null
  direction: ApiDirection
  trend: ApiTrendPoint[]
}

/** TC trae además el conteo crudo; opcionales para no romper con un backend que aún no los manda. */
export interface ApiTcKpi extends ApiKpi {
  /** Tareas creadas en el periodo que ya se completaron. */
  completed?: number
  /** Tareas creadas en el periodo. */
  total?: number
}

/** Tareas creadas trae el desglose del usuario en sesión; opcionales para no romper con un backend que aún no los manda. */
export interface ApiTasksCreatedKpi extends ApiKpi {
  /** De las tareas creadas en el periodo, las que tiene asignadas el usuario en sesión. */
  assigned_to_me?: number
  /** De las tareas creadas en el periodo, las que creó el usuario en sesión. */
  created_by_me?: number
}

export interface ApiKpis {
  tct: ApiKpi
  tc: ApiTcKpi
  tasks_created: ApiTasksCreatedKpi
  tpr: ApiKpi
  ica: ApiKpi
  iur: ApiKpi & { unattended: number }
}

export interface ApiKpisResponse extends ApiPeriodInfo {
  kpis: ApiKpis
}

export interface ApiLoadBar {
  id: number
  name: string
  value: number | null
  range: ApiRange | null
  load_status: ApiLoadStatus
}

export interface ApiLoadDistributionResponse {
  start: string
  end: string
  period: DashboardApiPeriod
  /** Línea punteada «Meta 85%». */
  goal: number
  saturated_count: number
  ranges: { range: ApiRange, min_rate: number }[]
  /** Ya vienen ordenadas de mayor a menor. */
  bars: ApiLoadBar[]
}

export interface ApiRowTrend {
  delta: number | null
  direction: ApiDirection
  series: ApiTrendPoint[]
}

export interface ApiPersonRow {
  id: number
  name: string
  position: number
  tct: number | null
  tc: number | null
  iur: number | null
  tpr: number | null
  /** Tareas trabajadas en el periodo (con paso a En progreso en el rango, sin importar su fecha límite) que ya se completaron: base del TC. */
  completed: number
  /** Todas las tareas asignadas a la persona que vencen en el periodo (`limit_date`). */
  total: number
  /** Tareas asignadas a la persona creadas (`created_at`) en el periodo. */
  created: number
  /** De las tareas que pasaron a En progreso en el periodo, las que ya están completadas: numerador del contador del TC. */
  created_completed: number
  weighted_load: { percentage: number | null, points_done: number, points: number }
  pending_load: { points: number, capacity: number, percentage: number, status: ApiLoadStatus }
  /** Tareas del periodo por prioridad: R (`low`), N (`normal`), A (`high`, llave `complex`) y U (urgentes + críticas); suman `total`. */
  distribution: ApiPriorityDistribution
  /** Lo mismo que `distribution`, pero de las tareas trabajadas en el periodo (base del TC): sus 4 valores suman `total`. */
  tc_distribution: ApiPriorityDistribution
  trend: ApiRowTrend
}

/** Reparto por prioridad (R/N/A/U): `complex` son las altas y `urgent` las urgentes + críticas. */
export interface ApiPriorityDistribution {
  quick: number
  normal: number
  complex: number
  urgent: number
}

/** Paginación de las tablas (`page_size` activa); sin `page_size` o con `export=true` la respuesta trae `pagination: null`. */
export interface ApiPagination {
  page: number
  page_size: number
  /** Filas que cumplen `search` (no el total de la compañía). */
  total: number
  total_pages: number
}

export interface ApiPeopleResponse extends ApiPeriodInfo {
  people: ApiPersonRow[]
  pagination: ApiPagination | null
}

/** Fila de `people/?export=true`: sin `trend.series` (el Excel solo usa `delta` y `direction`). */
export type ApiPersonExportRow = Omit<ApiPersonRow, 'trend'> & { trend: Pick<ApiRowTrend, 'delta' | 'direction'> }

export interface ApiPeopleExportResponse extends ApiPeriodInfo {
  people: ApiPersonExportRow[]
  pagination: null
}

export interface ApiProjectRow {
  id: number
  name: string
  /** Nombre (`teal`), hex o vacío. */
  color: string
  tct: number | null
  completed: number
  total: number
  active: number
  overdue: number
  max_overdue_days: number | null
  urgent: number
  /** Tareas del periodo por prioridad (mismas llaves que en `people/`); `urgent` aquí son todas las del periodo, no solo las abiertas. */
  distribution?: ApiPriorityDistribution
  /** Como `distribution`, de las tareas trabajadas en el periodo (base del TC); suma `total`. */
  tc_distribution?: ApiPriorityDistribution
  /** Máximo 5; el total real viene en `members_count`. */
  members: { id: number, name: string }[]
  members_count: number
  trend: ApiRowTrend
}

export interface ApiProjectsResponse extends ApiPeriodInfo {
  projects: ApiProjectRow[]
  pagination: ApiPagination | null
}
