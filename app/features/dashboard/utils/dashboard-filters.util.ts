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
  /** Temas elegidos (`project=2,3`); vacío = todos. */
  projectIds?: number[]
}

/**
 * Query string de `GET /api/dashboard/<bloque>/`. No manda `company` (el backend usa la compañía seleccionada del perfil)
 * y solo manda `my_tasks` / `project` cuando hay filtro: sin ellos el backend cuenta todo el equipo y todos los temas.
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
  if (filters.myTasks) {
    query.my_tasks = 'true'
  }
  if (filters.projectIds?.length) {
    query.project = filters.projectIds.join(',')
  }

  return query
}

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/

/** Rango completo (los dos días) y con el inicio antes o igual al fin; si no, el backend responde 400. */
export function isValidDateRange(start: string, end: string): boolean {
  return DAY_KEY.test(start) && DAY_KEY.test(end) && start <= end
}

/** Rango inicial al abrir «Personalizado»: los últimos 7 días contando hoy (hora de CDMX). */
export function defaultCustomRange(now: Date = new Date()): DashboardDateRange {
  const end = businessDayKey(now.toISOString()) ?? ''
  const startDate = new Date(`${end}T00:00:00Z`)
  startDate.setUTCDate(startDate.getUTCDate() - 6)
  return { start: startDate.toISOString().slice(0, 10), end }
}
