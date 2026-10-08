import type { ApiKpi, ApiKpis, ApiTasksCreatedKpi, ApiTcKpi } from '~/features/dashboard/types/dashboard-api.types'
import type { DashboardBadge, DashboardDelta, DashboardKpi } from '~/features/dashboard/types/dashboard.types'
import { NO_DATA, formatHours, formatPercent, formatSigned, rangeOf } from '~/features/dashboard/utils/dashboard.util'

export interface DashboardKpiSet {
  /** Cumplimiento en tiempo (TCT): la cabecera. */
  hero: DashboardKpi
  /** TC, tareas creadas, IUR, TPR e ICA, en el orden de las tarjetas. */
  cards: DashboardKpi[]
}

function seriesOf(kpi: ApiKpi): (number | null)[] {
  return kpi.trend.map(point => point.value)
}

/**
 * Variación contra el periodo de comparación. Sin comparativa (`compare = none`) o sin dato previo el backend manda
 * `delta` y `direction` en `null`: no hay indicador. En TPR menor es mejor, así que se invierte el color.
 */
function buildDelta(kpi: ApiKpi, unit: string, decimals: number, lowerIsBetter = false): DashboardDelta | null {
  if (kpi.delta == null || kpi.direction == null) {
    return null
  }

  const better = lowerIsBetter ? kpi.delta < 0 : kpi.delta > 0
  const worse = lowerIsBetter ? kpi.delta > 0 : kpi.delta < 0

  return {
    value: formatSigned(kpi.delta, unit, decimals),
    direction: kpi.direction,
    tone: better ? 'excellent' : worse ? 'danger' : 'neutral',
  }
}

/** Badge contra la meta (`{n}pp bajo meta` / `Sobre meta`); en IUR suma los urgentes sin atender. */
function buildRateBadge(kpi: ApiKpi, unattended = 0): DashboardBadge | undefined {
  const hasUnattended = unattended > 0

  if (kpi.value == null || kpi.goal == null) {
    return hasUnattended
      ? { labelKey: 'dashboard.badges.unattended', params: { count: unattended }, tone: 'danger' }
      : undefined
  }

  const gap = Number((kpi.goal - kpi.value).toFixed(1))
  if (gap > 0) {
    return {
      labelKey: hasUnattended ? 'dashboard.badges.belowTargetUnattended' : 'dashboard.badges.belowTarget',
      params: { pp: gap, count: unattended },
      tone: rangeOf(kpi.value) === 'danger' ? 'danger' : 'warning',
    }
  }

  return {
    labelKey: hasUnattended ? 'dashboard.badges.aboveTargetUnattended' : 'dashboard.badges.aboveTarget',
    params: { count: unattended },
    tone: hasUnattended ? 'warning' : 'good',
  }
}

/** Indicador de porcentaje (TCT, TC, IUR, ICA): color por rango, badge contra la meta y variación en `pp`. */
function buildRateKpi(key: string, kpi: ApiKpi, unattended = 0): DashboardKpi {
  return {
    key,
    value: formatPercent(kpi.value),
    tone: rangeOf(kpi.value),
    badge: buildRateBadge(kpi, unattended),
    delta: buildDelta(kpi, 'pp', 1),
    series: seriesOf(kpi),
  }
}

function buildCreatedKpi(kpi: ApiTasksCreatedKpi): DashboardKpi {
  const reachedGoal = kpi.value != null && kpi.goal != null && kpi.value >= kpi.goal

  const result: DashboardKpi = {
    key: 'created',
    value: kpi.value == null ? NO_DATA : String(kpi.value),
    tone: reachedGoal ? 'good' : 'neutral',
    badge: reachedGoal
      ? { labelKey: 'dashboard.badges.aboveTargetValue', params: { target: kpi.goal! }, tone: 'good' }
      : undefined,
    delta: buildDelta(kpi, '', 0),
    series: seriesOf(kpi),
  }
  // Desglose del usuario en sesión («6 asignadas a mí · 3 creadas por mí»), solo si el backend lo manda.
  if (kpi.assigned_to_me != null && kpi.created_by_me != null) {
    result.detail = {
      labelKey: 'dashboard.kpis.created.mine',
      params: { assigned: kpi.assigned_to_me, created: kpi.created_by_me },
    }
  }
  return result
}

/** TPR (horas): sin meta ni semáforo; menor es mejor. */
function buildTprKpi(kpi: ApiKpi): DashboardKpi {
  return {
    key: 'tpr',
    value: formatHours(kpi.value),
    tone: 'neutral',
    delta: buildDelta(kpi, 'h', 1, true),
    series: seriesOf(kpi),
  }
}

/** TC: además del porcentaje, el conteo crudo («70 de 468») cuando el backend lo manda; con `total` en 0, «—». */
function buildTcKpi(kpi: ApiTcKpi): DashboardKpi {
  const result = buildRateKpi('tc', kpi)
  if (kpi.completed != null && kpi.total != null) {
    result.detail = kpi.total === 0
      ? { labelKey: 'dashboard.kpis.tc.countEmpty', params: {} }
      : { labelKey: 'dashboard.kpis.tc.count', params: { completed: kpi.completed, total: kpi.total } }
  }
  return result
}

/** Convierte `GET /api/dashboard/kpis/` en lo que pintan la cabecera y las tarjetas. */
export function buildDashboardKpis(kpis: ApiKpis): DashboardKpiSet {
  const hero = buildRateKpi('tct', kpis.tct)
  if (kpis.tct.goal != null) {
    hero.goal = kpis.tct.goal
  }

  return {
    hero,
    cards: [
      buildTcKpi(kpis.tc),
      buildCreatedKpi(kpis.tasks_created),
      buildRateKpi('iur', kpis.iur, kpis.iur.unattended),
      buildTprKpi(kpis.tpr),
      buildRateKpi('ica', kpis.ica),
    ],
  }
}
