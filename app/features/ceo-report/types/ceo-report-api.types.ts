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

export type ReportPerformanceRange = 'excellent' | 'good' | 'regular' | 'critical'

/** Las personas (`by_person`) llevan además el rango de desempeño según su `completion_rate`. */
export interface ReportPersonMetric extends ReportBreakdownMetric {
  /** Ausente en reportes guardados antes de que el backend calculara la distribución. */
  range?: ReportPerformanceRange
}

export interface ReportDistributionPerson {
  id: number
  /** Nombre completo (first_name + last_name). */
  name: string
  completion_rate: number | null
  total_tasks: number
}

/** Un rango de desempeño. `min_rate` es inclusivo y `max_rate` exclusivo (salvo 100). */
export interface ReportPerformanceBucket {
  range: ReportPerformanceRange
  min_rate: number
  max_rate: number
  count: number
  people: ReportDistributionPerson[]
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
  by_person: ReportPersonMetric[]
  /** Siempre 4 rangos (excellent, good, regular, critical). Ausente en reportes viejos: hay que regenerarlos. */
  performance_distribution?: ReportPerformanceBucket[]
}

/** Decisión sugerida por la IA: trae lo necesario para el botón «Crear como tarea». */
export interface ReportNarrativeDecision {
  title: string
  description?: string
  assignee_id?: number | null
  metric?: string
  /** `YYYY-MM-DD`. */
  due_date?: string | null
  needs_review?: boolean
}

/**
 * Texto redactado por Nexxa IA (callback de n8n `nexxus-reporte`). Cada sección es opcional: la que falte se muestra
 * como «IA en preparación». Las notas vienen por id (equipo, proyecto/tema y persona). Con `needs_review` en `true`
 * o con `warnings` el texto no se dibuja hasta que alguien lo revise; `status: 'error'` trae `error`.
 */
export interface ReportNarrative {
  status?: 'done' | 'error'
  error?: string
  needs_review?: boolean
  warnings?: string[]
  model?: string
  generated_at?: string
  verdict?: string
  insights?: Array<{ text: string, metric?: string, team?: string }>
  team_notes?: Record<string, string>
  theme_notes?: Record<string, string>
  person_notes?: Record<string, string>
  closing?: { headline?: string, callout?: string, paragraphs?: string[] }
  decisions?: ReportNarrativeDecision[]
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
  /** Texto de IA: hoy el backend siempre manda `null`. Se valida con `parseNarrative` antes de usarlo. */
  narrative: unknown
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
