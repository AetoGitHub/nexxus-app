<script setup lang="ts">
import { parseDate } from '@internationalized/date'
import type { DateRange } from 'reka-ui'
import type { DashboardDateRange, DashboardPeriod } from '~/features/dashboard/types/dashboard.types'
import {
  currentRangeOf,
  formatDayKey,
  formatWeekRange,
  isSameRange,
  periodOptions,
  weekRangeOf,
} from '~/features/dashboard/utils/dashboard-periods.util'
import type { PeriodOption } from '~/features/dashboard/utils/dashboard-periods.util'
import { businessDayKey } from '~/shared/utils/date'

/**
 * Filtro por periodo: elige un periodo anterior del tipo activo (Semana, Mes, Trimestre o Año). En Semana abre un
 * calendario: el día elegido marca la semana completa (domingo a sábado). En los demás, una lista de los periodos
 * anteriores. `range` es `null` en el periodo en curso (se pide con `period`) o el rango concreto elegido.
 */
const props = defineProps<{
  period: DashboardPeriod
  /** El rango personalizado manda: este filtro no aplica. */
  disabled?: boolean
}>()

const range = defineModel<DashboardDateRange | null>('range', { required: true })

const { t, locale } = useI18n()

const open = ref(false)
// «Hoy» en hora de CDMX; se recalcula al abrir por si la pestaña lleva abierta de un día a otro.
const today = ref(businessDayKey(new Date().toISOString()) ?? '')
watch(open, (isOpen) => {
  if (isOpen) {
    today.value = businessDayKey(new Date().toISOString()) ?? today.value
  }
})

const currentRange = computed(() => currentRangeOf(props.period, today.value))

/** Elegir el periodo en curso equivale a no filtrar: vuelve a pedirse con `period`. */
function select(next: DashboardDateRange) {
  range.value = isSameRange(next, currentRange.value) ? null : next
  open.value = false
}

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase(locale.value) + text.slice(1)
}

// ---- Semana: calendario con la semana completa marcada ----
const weekModel = computed<DateRange>(() => {
  const shown = range.value ?? currentRange.value
  return { start: parseDate(shown.start), end: parseDate(shown.end) }
})
const maxDate = computed(() => parseDate(today.value))

/** El calendario de rango emite el día tocado como inicio de un rango nuevo: se toma ese día y se marca su semana. */
function onWeekPick(value: DateRange | null) {
  if (!value) {
    return
  }
  const shown = [weekModel.value.start.toString(), weekModel.value.end.toString()]
  const touched = [value.start, value.end].filter(Boolean).map(day => day!.toString())
  const picked = touched.find(day => !shown.includes(day)) ?? touched[0]
  if (!picked || picked > today.value) {
    return
  }
  select(weekRangeOf(picked))
}

const weekLabel = computed(() => formatWeekRange(range.value ?? currentRange.value, locale.value))

// ---- Mes, trimestre y año: lista de los anteriores ----
const options = computed<PeriodOption[]>(() =>
  props.period === 'week' ? [] : periodOptions(props.period, today.value),
)

function optionLabel(option: PeriodOption): string {
  if (props.period === 'month') {
    return capitalize(formatDayKey(option.range.start, locale.value, { month: 'long', year: 'numeric' }))
  }
  if (props.period === 'quarter') {
    const months = `${formatDayKey(option.range.start, locale.value, { month: 'short' })} – ${formatDayKey(option.range.end, locale.value, { month: 'short' })}`
    return `${t('dashboard.periodFilter.quarter', { n: option.index ?? 1, year: option.year })} (${months})`
  }
  return String(option.year)
}

function isSelected(option: PeriodOption): boolean {
  return range.value ? isSameRange(range.value, option.range) : option.current
}

const listTitle = computed(() => t(`dashboard.periodFilter.pick${capitalize(props.period)}`))

const buttonLabel = computed(() => {
  if (!range.value) {
    return t('dashboard.periodFilter.current')
  }
  if (props.period === 'week') {
    return formatWeekRange(range.value, locale.value)
  }
  const match = options.value.find(option => isSameRange(option.range, range.value))
  return match ? optionLabel(match) : t('dashboard.periodFilter.current')
})
</script>

<template>
  <UPopover
    v-model:open="open"
    :content="{ align: 'end', sideOffset: 6 }"
  >
    <UButton
      type="button"
      color="neutral"
      variant="outline"
      size="sm"
      icon="i-lucide-calendar-range"
      trailing-icon="i-lucide-chevron-down"
      :disabled="disabled"
      :title="disabled ? t('dashboard.periodFilter.disabledCustom') : `${t('dashboard.periodFilter.label')}. ${t('dashboard.periodFilter.byDueDate')}`"
      :aria-label="`${t('dashboard.periodFilter.label')}. ${t('dashboard.periodFilter.byDueDate')}`"
    >
      <span class="hidden text-muted-foreground sm:inline">{{ t('dashboard.periodFilter.label') }}:</span>
      <span class="font-medium">{{ buttonLabel }}</span>
    </UButton>

    <template #content>
      <div
        v-if="period === 'week'"
        class="space-y-2 p-2"
      >
        <p class="max-w-64 px-1 text-xs text-muted-foreground">
          {{ t('dashboard.periodFilter.weekHint') }}
        </p>
        <UCalendar
          range
          :model-value="weekModel"
          :max-value="maxDate"
          :locale="locale"
          :week-starts-on="0"
          :fixed-weeks="false"
          @update:model-value="onWeekPick"
        />
        <p class="px-1 text-xs font-medium text-foreground">
          {{ t('dashboard.periodFilter.weekRange', { range: weekLabel }) }}
        </p>
      </div>

      <div
        v-else
        class="w-64 p-1.5"
      >
        <p class="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          {{ listTitle }}
        </p>
        <ul class="max-h-72 overflow-y-auto">
          <li
            v-for="option in options"
            :key="option.id"
          >
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              :class="isSelected(option) ? 'font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'"
              :aria-pressed="isSelected(option)"
              @click="select(option.range)"
            >
              <span class="min-w-0 flex-1 truncate">{{ optionLabel(option) }}</span>
              <span
                v-if="option.current"
                class="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground"
              >{{ t('dashboard.periodFilter.currentTag') }}</span>
              <UIcon
                v-if="isSelected(option)"
                name="i-lucide-check"
                class="size-4 shrink-0 text-primary"
              />
            </button>
          </li>
        </ul>
      </div>
    </template>
  </UPopover>
</template>
