export type CeoRating = 'excellent' | 'good' | 'regular' | 'critical'
export type CeoTrend = 'up' | 'down' | 'stable'
export type CeoTone = 'good' | 'bad' | 'neutral'

/*
 * Modelo de vista del reporte. Los campos opcionales son los que hoy la API no entrega
 * (textos de IA, series de tiempo, vencidas, integrantes...): la vista oculta lo que falta.
 */

export interface CeoReportMeta {
  periodLabel: string
  scopeLabel: string
  teamsCount: number
  tasksCount: number
  generatedAt: string
  comparisonLabel: string
  confidentialityLabel: string
}

export interface CeoHeroKpi {
  value: number
  goal?: number
  rating: CeoRating
  deltaLabel?: string
  side: Array<{ label: string, value: string, deltaLabel?: string, tone: CeoTone }>
  summary?: string
}

export interface CeoKpiRow {
  key: string
  label: string
  value: string
  goalLabel?: string
  /** 0-100; sin valor no se dibuja la barra. */
  progress?: number
  trend?: CeoTrend
  trendLabel?: string
  series?: number[]
  accent: 'teal' | 'green'
  whatHappened?: string
  whatItMeans?: string
}

/**
 * Texto de Nexxa IA ya validado. Cada sección es opcional: la que falte se dibuja como
 * «IA en preparación» en lugar de inventar contenido.
 */
export interface CeoNarrative {
  model?: string
  /** Fecha de generación ya formateada. */
  generatedAt?: string
  verdict?: string
  insights?: Array<{ index: string, text: string, metric?: string, team?: string }>
}

/**
 * Estado de la IA cuando el texto NO se dibuja: `review` = n8n marcó `needs_review` o mandó `warnings` (hay que
 * revisarlo antes de mostrarlo o mandarlo al CEO); `error` = n8n no pudo redactarlo.
 */
export interface CeoAiReview {
  state: 'review' | 'error'
  warnings: string[]
  error?: string
}

export interface CeoTeam {
  id?: number
  name: string
  people?: number
  color: string
  rating: CeoRating
  completion: number
  /** `null` si ninguna completada tiene fecha límite. */
  punctuality: number | null
  series?: number[]
  tasks: number
  overdue?: number
  avgResolution: string
  reasonTitle?: string
  reason?: string
}

export interface CeoCategory {
  id?: number
  name: string
  teams?: string[]
  rating: CeoRating
  completion: number
  overdue?: number
  avgResolution: string
  reasonTitle?: string
  reason?: string
}

export interface CeoPerson {
  id?: number
  name: string
  team?: string
  teamColor?: string
  avatarColor: string
  completion: number
  punctuality: number | null
  tasks: number
  overdue?: number
  note?: string
  deltaLabel?: string
}

export interface CeoDistributionPerson {
  id: number
  name: string
  /** `null` si la API no lo calculó. */
  completion: number | null
  tasks: number
}

export interface CeoDistributionBucket {
  range: CeoRating
  /** Rango legible, p. ej. «≥85%», «70–84%» o «<55%». */
  rangeLabel: string
  count: number
  people: CeoDistributionPerson[]
}

export interface CeoDistribution {
  buckets: CeoDistributionBucket[]
  /** Personas en el rango crítico. */
  criticalCount: number
  /** Mayor `count` de los rangos: escala de las barras. */
  maxCount: number
  /** Meta de completación (corte del rango excelente); `undefined` si no hay rango excelente. */
  goal?: number
}

export interface CeoPeopleSection {
  intro?: string
  /** `undefined` en reportes viejos (sin `performance_distribution`): hay que regenerarlos. */
  distribution?: CeoDistribution
  stats?: Array<{ value: number, label: string, names: string, tone: 'bad' | 'warn' | 'good' }>
  top: CeoPerson[]
  bottom: CeoPerson[]
}

export interface CeoNexxtepSection {
  stats: Array<{ value: string, label: string }>
  executives: Array<{
    name: string
    team: string
    avatarColor: string
    virtualName: string
    managements: number
    autonomy: number
    escalations: number
    priority: 'high' | 'medium' | 'low'
  }>
  note: string
}

export interface CeoDecision {
  index: string
  title: string
  description: string
  assignee: string
  metric: string
  date: string
  /** Para «Crear como tarea»: la persona (`assignee_id`) y la fecha `YYYY-MM-DD` tal como las mandó la IA. */
  assigneeId: number | null
  dueDate: string | null
  /** La IA no estuvo segura de esta decisión: se marca «por revisar». */
  needsReview: boolean
}

export interface CeoClosing {
  title: string
  /** Frase destacada; sin ella no se dibuja la cita. */
  quote?: string
  paragraphs: string[]
  /** Hay titular o párrafos de la IA: sin ellos solo se dibujan las decisiones. */
  hasSummary: boolean
  decisionsEyebrow: string
  decisions: CeoDecision[]
  disclaimer: string
}

export interface CeoReport {
  meta: CeoReportMeta
  narrative: CeoNarrative | null
  /** Presente cuando hay texto de IA que no se dibuja (por revisar o con error). */
  aiReview?: CeoAiReview
  hero: CeoHeroKpi
  kpis: CeoKpiRow[]
  teams: { intro?: string, items: CeoTeam[] }
  categories: {
    intro?: string
    items: CeoCategory[]
    alerts?: Array<{ tone: 'bad' | 'good', text: string }>
  }
  people: CeoPeopleSection
  nexxtep?: CeoNexxtepSection
  closing?: CeoClosing
}
