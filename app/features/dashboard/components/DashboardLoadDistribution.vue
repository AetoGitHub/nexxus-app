<script setup lang="ts">
import DashboardBlockState from '~/features/dashboard/components/shared/DashboardBlockState.vue'
import DashboardLoadRangeBar from '~/features/dashboard/components/shared/DashboardLoadRangeBar.vue'
import MetricTooltip from '~/features/dashboard/components/shared/MetricTooltip.vue'
import type { ApiLoadDistributionResponse } from '~/features/dashboard/types/dashboard-api.types'
import type { DashboardTone } from '~/features/dashboard/types/dashboard.types'
import { RANGE_TONE } from '~/features/dashboard/utils/dashboard.util'

/** Carga productiva por rango: una barra horizontal por rango con cuántas personas caen en él; el tooltip lista quiénes y su porcentaje. */
const props = defineProps<{
  load: ApiLoadDistributionResponse | undefined
  loading: boolean
  refreshing: boolean
  error: string
}>()

defineEmits<{
  retry: []
}>()

const { t } = useI18n()

const bars = computed(() => props.load?.bars ?? [])

/** Rangos del backend con sus límites: `≥85`, `70-84`, `55-69`, `<55`. */
const legend = computed(() => {
  const ranges = props.load?.ranges ?? []

  return ranges.map((item, index) => {
    const upper = index > 0 ? ranges[index - 1]!.min_rate : null
    let limits: string
    if (upper == null) {
      limits = `≥${item.min_rate}%`
    }
    else if (index === ranges.length - 1) {
      limits = `<${upper}%`
    }
    else {
      limits = `${item.min_rate}-${upper - 1}%`
    }

    return { range: item.range, tone: RANGE_TONE[item.range], limits }
  })
})

/** Una barra por rango (de mayor a menor) con sus personas, de mayor a menor porcentaje; sin dato va aparte, al final. */
const groups = computed(() => {
  const bars = props.load?.bars ?? []
  const byValue = (a: { value: number | null }, b: { value: number | null }) => (b.value ?? -1) - (a.value ?? -1)

  const result = legend.value.map(item => ({
    key: item.range as string,
    label: t(`dashboard.ranges.${item.range}`),
    limits: item.limits,
    tone: item.tone as DashboardTone | null,
    people: bars.filter(bar => bar.range === item.range).sort(byValue),
  }))

  const withoutData = bars.filter(bar => bar.range == null)
  if (withoutData.length > 0) {
    result.push({ key: 'none', label: t('dashboard.load.noRange'), limits: '', tone: null, people: withoutData })
  }
  return result
})

/** El largo de cada barra es relativo a la que tiene más personas. */
const maxCount = computed(() => Math.max(1, ...groups.value.map(group => group.people.length)))
</script>

<template>
  <section class="rounded-xl border border-border bg-card p-4">
    <h2 class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
      {{ t('dashboard.load.title') }}
    </h2>

    <div class="mt-3 flex items-center gap-2">
      <h3 class="text-[11px] font-semibold uppercase tracking-wider text-foreground/80">
        <MetricTooltip metric="load_distribution">
          {{ t('dashboard.load.productive') }}
        </MetricTooltip>
      </h3>
      <span
        v-if="load && load.saturated_count > 0"
        class="rounded bg-red-600/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:text-red-400"
      >
        {{ t('dashboard.load.saturated', { count: load.saturated_count }) }}
      </span>
    </div>

    <DashboardBlockState
      class="mt-4"
      :loading="loading"
      :error="error"
      :empty="bars.length === 0"
      :empty-text="t('dashboard.load.empty')"
      :refreshing="refreshing"
      @retry="$emit('retry')"
    >
      <template #loading>
        <USkeleton class="h-28 w-full rounded-lg" />
      </template>

      <template v-if="load">
        <div class="space-y-1">
          <DashboardLoadRangeBar
            v-for="group in groups"
            :key="group.key"
            :label="group.label"
            :limits="group.limits"
            :tone="group.tone"
            :people="group.people"
            :width="(group.people.length / maxCount) * 100"
          />
        </div>
      </template>
    </DashboardBlockState>
  </section>
</template>
