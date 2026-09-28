export type CeoRating = 'excellent' | 'good' | 'regular' | 'critical'
export type CeoTrend = 'up' | 'down' | 'stable'
export type CeoTone = 'good' | 'bad' | 'neutral'

export interface CeoReportMeta {
  periodLabel: string
  scopeLabel: string
  teamsCount: number
  tasksCount: number
  generatedAt: string
  comparisonLabel: string
  aiModel: string
  confidentialityLabel: string
}

export interface CeoHeroKpi {
  value: number
  goal: number
  rating: CeoRating
  deltaLabel: string
  side: Array<{ label: string, value: string, deltaLabel: string, tone: CeoTone }>
  summary: string
}

export interface CeoKpiRow {
  key: string
  label: string
  value: string
  goalLabel: string
  progress: number
  trend: CeoTrend
  trendLabel: string
  series: number[]
  accent: 'teal' | 'green'
  whatHappened: string
  whatItMeans: string
}

export interface CeoInsight {
  index: string
  text: string
  visual:
    | { kind: 'bars', items: Array<{ label: string, value: number, tone: 'good' | 'bad' }> }
    | { kind: 'stat', value: string, caption: string, tone: 'bad' | 'good' }
    | { kind: 'split', left: { value: string, caption: string }, right: { value: string, caption: string } }
}

export interface CeoTeam {
  name: string
  people: number
  color: string
  rating: CeoRating
  completion: number
  punctuality: number
  series: number[]
  tasks: number
  overdue: number
  avgResolution: string
  reasonTitle: string
  reason: string
}

export interface CeoCategory {
  name: string
  teams: string[]
  rating: CeoRating
  completion: number
  overdue: number
  avgResolution: string
  reasonTitle: string
  reason: string
}

export interface CeoPerson {
  name: string
  team: string
  teamColor: string
  avatarColor: string
  completion: number
  punctuality: number
  tasks: number
  overdue: number
  note: string
  deltaLabel?: string
}

export interface CeoLoadBar {
  value: number
  rating: CeoRating
}

export interface CeoPeopleSection {
  intro: string
  loadBars: CeoLoadBar[]
  loadGoal: number
  saturatedCount: number
  stats: Array<{ value: number, label: string, names: string, tone: 'bad' | 'warn' | 'good' }>
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
}

export interface CeoClosing {
  title: string
  quote: string
  paragraphs: string[]
  decisionsEyebrow: string
  decisions: CeoDecision[]
  disclaimer: string
}

export interface CeoReport {
  meta: CeoReportMeta
  verdict: string
  hero: CeoHeroKpi
  kpis: CeoKpiRow[]
  insights: { footnote: string, items: CeoInsight[] }
  teams: { intro: string, items: CeoTeam[] }
  categories: {
    intro: string
    items: CeoCategory[]
    alerts: Array<{ tone: 'bad' | 'good', text: string }>
  }
  people: CeoPeopleSection
  nexxtep: CeoNexxtepSection
  closing: CeoClosing
}
