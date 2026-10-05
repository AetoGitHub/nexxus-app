import type {
  ApiDirection,
  DashboardApiCompare,
  DashboardApiPeriod,
} from '~/features/dashboard/types/dashboard-api.types'

/** Semáforo de un indicador: `excellent` ≥ meta, `good` bueno, `warning` atención, `danger` crítico, `neutral` sin juicio. */
export type DashboardTone = 'neutral' | 'excellent' | 'good' | 'warning' | 'danger'

export type DashboardDirection = NonNullable<ApiDirection>

export type DashboardPeriod = DashboardApiPeriod

export type DashboardCompare = DashboardApiCompare

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
  /** Ya formateado; `—` cuando no hay datos. */
  value: string
  tone: DashboardTone
  badge?: DashboardBadge
  /** `null` cuando no se compara o no hay con qué comparar. */
  delta: DashboardDelta | null
  /** Meta que se muestra junto a la variación (`meta ≥85%`). */
  goal?: number
  /** Los `null` cortan la línea. */
  series: (number | null)[]
}
