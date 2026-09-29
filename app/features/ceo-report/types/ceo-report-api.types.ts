/** Contrato de `REPORTS_API.md` (backend `reports`). */

export type ReportPeriodType = 'daily' | 'weekly' | 'monthly'

/** Mismas 3 métricas agrupadas por equipo (Group), proyecto (Project) o persona (Profile). */
export interface ReportBreakdownMetric {
  id: number
  /** Group.name, Project.name o Profile.username. */
  name: string
  total_tasks: number
  completed_tasks: number
  completion_rate: number | null
  punctuality_rate: number | null
  avg_resolution_days: number | null
}

/** Diferencia contra el reporte anterior de la misma empresa y tipo de período (puntos porcentuales / días). */
export interface ReportDeltaVsPrevious {
  completion_rate: number | null
  punctuality_rate: number | null
  avg_resolution_days: number | null
}

export interface ReportMetrics {
  total_tasks: number
  completed_tasks: number
  /** `null` si no hay tareas en el período. */
  completion_rate: number | null
  /** `null` si ninguna completada tiene fecha límite. */
  punctuality_rate: number | null
  /** Completadas sin fecha límite: no cuentan para la puntualidad. */
  punctuality_excluded: number
  /** `null` si no hay completadas con fecha de cierre. */
  avg_resolution_days: number | null
  tasks_without_team: number
  tasks_without_assignee: number
  /** `null` si es el primer reporte de esa combinación. */
  delta_vs_previous: ReportDeltaVsPrevious | null
  by_team: ReportBreakdownMetric[]
  by_project: ReportBreakdownMetric[]
  by_person: ReportBreakdownMetric[]
}

export interface Report {
  id: number
  company: number
  period_type: ReportPeriodType
  /** `YYYY-MM-DD`. */
  period_start: string
  /** `YYYY-MM-DD`. */
  period_end: string
  metrics: ReportMetrics
  /** Reservado para el texto de IA: hoy siempre `null`. */
  narrative: unknown | null
  created_at: string
  updated_at: string
}

export interface GenerateReportPayload {
  company: number
  period_type: ReportPeriodType
  period_start: string
  period_end: string
  /** Recalcula aunque ya exista el reporte de esa empresa, tipo y fecha de inicio. */
  force?: boolean
}
