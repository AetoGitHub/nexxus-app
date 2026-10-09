<script setup lang="ts">
import DashboardBlockState from '~/features/dashboard/components/shared/DashboardBlockState.vue'
import DashboardLoadRangeBar from '~/features/dashboard/components/shared/DashboardLoadRangeBar.vue'
import MetricTooltip from '~/features/dashboard/components/shared/MetricTooltip.vue'
import type { ApiLoadDistributionResponse } from '~/features/dashboard/types/dashboard-api.types'
import type { DashboardTone } from '~/features/dashboard/types/dashboard.types'
import { RANGE_TONE } from '~/features/dashboard/utils/dashboard.util'

/** Carga productiva por décima: una barra vertical por cada 10 puntos de porcentaje con cuántas personas caen en ella; el tooltip lista quiénes y su porcentaje. */
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

/** Tono y nombre del rango del backend (Excelente, Bueno…) al que pertenece un porcentaje. */
function rangeOfValue(value: number): { tone: DashboardTone, name: string } {
  const ranges = props.load?.ranges ?? []
  const hit = ranges.find(item => value >= item.min_rate) ?? ranges[ranges.length - 1]
  return hit ? { tone: RANGE_TONE[hit.range], name: t(`dashboard.ranges.${hit.range}`) } : { tone: 'neutral', name: '' }
}

/** Cubeta de 10 en 10 (0 = 0-9 … 9 = 90-100) de un porcentaje; se redondea antes para coincidir con el que se muestra. */
function bucketOf(value: number): number {
  return Math.min(Math.max(Math.floor(Math.round(value) / 10), 0), 9)
}

/** Diez barras de 10 en 10 (de 90-100% a 0-9%) con sus personas, de mayor a menor porcentaje; quien no tiene dato no se grafica. */
const groups = computed(() => {
  const people = props.load?.bars ?? []
  const byValue = (a: { value: number | null }, b: { value: number | null }) => (b.value ?? -1) - (a.value ?? -1)

  return Array.from({ length: 10 }, (_, index) => {
    const bucket = 9 - index
    const low = bucket * 10
    const high = bucket === 9 ? 100 : low + 9
    // El tono sale del punto medio de la cubeta contra los rangos del backend.
    const { tone, name } = rangeOfValue(low + 5)
    return {
      key: String(bucket),
      label: `${low}–${high}%`,
      shortLabel: String(low),
      limits: name,
      tone: tone as DashboardTone | null,
      people: people.filter(bar => bar.value != null && bucketOf(bar.value) === bucket).sort(byValue),
    }
  })
})

/** El alto de cada barra es relativo a la que tiene más personas. */
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
        <div class="flex h-40 items-stretch gap-1.5 sm:gap-3">
          <DashboardLoadRangeBar
            v-for="group in groups"
            :key="group.key"
            :label="group.label"
            :short-label="group.shortLabel"
            :limits="group.limits"
            :tone="group.tone"
            :people="group.people"
            :height="(group.people.length / maxCount) * 100"
          />
        </div>
      </template>
    </DashboardBlockState>
  </section>
</template>
