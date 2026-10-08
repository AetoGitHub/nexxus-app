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
  weighted_load: { percentage: number | null, points_done: number, points: number }
  pending_load: { points: number, capacity: number, percentage: number, status: ApiLoadStatus }
  distribution: { quick: number, normal: number, complex: number }
  trend: ApiRowTrend
}

export interface ApiPeopleResponse extends ApiPeriodInfo {
  people: ApiPersonRow[]
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
  members: { id: number, name: string }[]
  trend: ApiRowTrend
}

export interface ApiProjectsResponse extends ApiPeriodInfo {
  projects: ApiProjectRow[]
}
