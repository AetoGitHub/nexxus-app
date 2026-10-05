/** Semáforo de un indicador: `excellent` ≥ meta, `good` bueno, `warning` atención, `danger` crítico, `neutral` sin juicio. */
export type DashboardTone = 'neutral' | 'excellent' | 'good' | 'warning' | 'danger'

export type DashboardDirection = 'up' | 'down'

export interface DashboardBadge {
  /** Clave i18n del texto (ej. `dashboard.badges.aboveTarget`). */
  labelKey: string
  params?: Record<string, string | number>
  tone: DashboardTone
}

export interface DashboardDelta {
  /** Texto ya formateado (ej. `+8pp`, `-0.8h`). */
  value: string
  direction: DashboardDirection
  tone: DashboardTone
}

/** Indicador con valor, variación y tendencia (tarjetas de KPI y el principal). */
export interface DashboardKpi {
  /** Identifica el texto en `dashboard.kpis.<key>`. */
  key: string
  value: string
  tone: DashboardTone
  badge?: DashboardBadge
  delta: DashboardDelta
  /** Nota junto a la variación (ej. `meta ≥85%`). */
  note?: string
  series: number[]
}

export interface DashboardToneValue {
  value: string
  tone: DashboardTone
}

export interface DashboardLoadBar {
  id: number
  name: string
  /** Carga productiva en porcentaje (0-100+). */
  value: number
}

export interface DashboardLoadDistribution {
  goal: number
  saturatedCount: number
  bars: DashboardLoadBar[]
}

export type DashboardPendingState = 'available' | 'limit' | 'saturated'

export interface DashboardCollaborator {
  id: number
  name: string
  initials: string
  /** Color del avatar. */
  color: string
  tct: DashboardToneValue
  tc: DashboardToneValue
  iur: DashboardToneValue
  tpr: DashboardToneValue
  load: { percent: number, used: number, cap: number, tone: DashboardTone }
  pending: { used: number, cap: number, state: DashboardPendingState }
  /** Reparto de tareas por esfuerzo: Rápidas, Normales, Complejas. */
  distribution: { quick: number, normal: number, complex: number }
  trend: { series: number[], direction: DashboardDirection, tone: DashboardTone }
}

export interface DashboardTopic {
  id: number
  name: string
  color: string
  tct: DashboardToneValue
  completed: { done: number, total: number }
  active: { value: number, tone: DashboardTone }
  overdue: { value: number, maxDays?: number }
  urgent: number
  members: string[]
  extraMembers: number
  trend: { series: number[], direction: DashboardDirection, tone: DashboardTone }
}

export type DashboardExecutiveStatus = 'managing' | 'waiting' | 'escalated'

export interface DashboardExecutive {
  id: number
  name: string
  owner: string
  managements: number
  messages: number
  appointments: number
  evidences: number
  autonomousRate: DashboardToneValue
  closeTime: DashboardToneValue
  status: DashboardExecutiveStatus
}

export interface DashboardNexxtepTile {
  key: 'active' | 'waiting' | 'escalated' | 'autonomous'
  value: number
  tone: DashboardTone
}

export interface DashboardNexxtep {
  kpis: DashboardKpi[]
  tiles: DashboardNexxtepTile[]
  executives: DashboardExecutive[]
}

export type DashboardPeriod = 'week' | 'month' | 'quarter' | 'year'

export type DashboardScope = 'mine' | 'team'

export interface DashboardData {
  hero: DashboardKpi
  kpis: DashboardKpi[]
  load: DashboardLoadDistribution
  collaborators: DashboardCollaborator[]
  topics: DashboardTopic[]
  nexxtep: DashboardNexxtep
}
