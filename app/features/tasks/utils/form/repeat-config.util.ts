import type {
  RepeatFrequency,
  RepeatMonth,
  RepeatWeekOfMonth,
  RepeatWeekday,
  TaskRepeatConfig,
} from '~/features/tasks/types/task.types'

const WEEKDAYS: RepeatWeekday[] = [1, 2, 3, 4, 5, 6, 7]
const WEEKS_OF_MONTH: RepeatWeekOfMonth[] = [1, 2, 3, 4, -1]
const MONTHS: RepeatMonth[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const FREQUENCIES: RepeatFrequency[] = ['daily', 'weekly', 'monthly', 'yearly']

export function createDefaultRepeatConfig(): TaskRepeatConfig {
  return {
    frequency: 'weekly',
    every: 1,
    weekday: 1,
    week_of_month: null,
    on_month: null,
  }
}

function asWeekday(value: unknown): RepeatWeekday | null {
  const n = Number(value)
  return WEEKDAYS.includes(n as RepeatWeekday) ? n as RepeatWeekday : null
}

function asWeekOfMonth(value: unknown): RepeatWeekOfMonth | null {
  const n = Number(value)
  return WEEKS_OF_MONTH.includes(n as RepeatWeekOfMonth) ? n as RepeatWeekOfMonth : null
}

function asMonth(value: unknown): RepeatMonth | null {
  const n = Number(value)
  return MONTHS.includes(n as RepeatMonth) ? n as RepeatMonth : null
}

function asEvery(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) {
    return 1
  }
  return Math.max(1, Math.floor(n))
}

function asFrequency(value: unknown): RepeatFrequency {
  return FREQUENCIES.includes(value as RepeatFrequency)
    ? value as RepeatFrequency
    : 'weekly'
}

/** Rellena defaults y limpia campos que no aplican a la frecuencia. */
export function normalizeRepeatConfig(config: TaskRepeatConfig): TaskRepeatConfig {
  const every = asEvery(config.every)
  const weekday = config.weekday ?? 1
  const weekOfMonth = config.week_of_month ?? 1
  const onMonth = config.on_month ?? 1

  switch (config.frequency) {
    case 'daily':
      return { frequency: 'daily', every, weekday: null, week_of_month: null, on_month: null }
    case 'weekly':
      return { frequency: 'weekly', every, weekday, week_of_month: null, on_month: null }
    case 'monthly':
      return { frequency: 'monthly', every, weekday, week_of_month: weekOfMonth, on_month: null }
    case 'yearly':
      return { frequency: 'yearly', every, weekday, week_of_month: weekOfMonth, on_month: onMonth }
  }
}

export function parseRepeatConfig(value: unknown): TaskRepeatConfig {
  if (!value || typeof value !== 'object') {
    return createDefaultRepeatConfig()
  }

  const raw = value as Partial<TaskRepeatConfig>
  return normalizeRepeatConfig({
    frequency: asFrequency(raw.frequency),
    every: asEvery(raw.every),
    weekday: asWeekday(raw.weekday),
    week_of_month: asWeekOfMonth(raw.week_of_month),
    on_month: asMonth(raw.on_month),
  })
}

export function isRepeatConfigComplete(config: TaskRepeatConfig): boolean {
  const normalized = normalizeRepeatConfig(config)
  if (normalized.every < 1) {
    return false
  }
  if (normalized.frequency === 'weekly' && normalized.weekday == null) {
    return false
  }
  if (normalized.frequency === 'monthly'
    && (normalized.weekday == null || normalized.week_of_month == null)) {
    return false
  }
  if (normalized.frequency === 'yearly'
    && (normalized.weekday == null || normalized.week_of_month == null || normalized.on_month == null)) {
    return false
  }
  return true
}
