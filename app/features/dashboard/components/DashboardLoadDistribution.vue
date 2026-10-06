<script setup lang="ts">
import DashboardBlockState from '~/features/dashboard/components/shared/DashboardBlockState.vue'
import MetricTooltip from '~/features/dashboard/components/shared/MetricTooltip.vue'
import type { ApiLoadDistributionResponse } from '~/features/dashboard/types/dashboard-api.types'
import { NO_DATA, RANGE_TONE, TONE_BG } from '~/features/dashboard/utils/dashboard.util'

/** Carga productiva por colaborador contra la meta (barras verticales + línea de meta). */
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

/** Leyenda a partir de los rangos del backend: `≥85`, `70-84`, `55-69`, `<55`. */
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

    return { range: item.range, tone: RANGE_TONE[item.range], label: `${t(`dashboard.ranges.${item.range}`)} ${limits}` }
  })
})

function barLabel(name: string, value: number | null): string {
  return `${name}: ${value == null ? NO_DATA : `${Math.round(value)}%`}`
}
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
        <div class="relative h-28">
          <ul class="flex h-full items-end gap-2">
            <li
              v-for="bar in bars"
              :key="bar.id"
              class="flex h-full min-w-0 flex-1 items-end"
            >
              <UTooltip
                :text="barLabel(bar.name, bar.value)"
                class="w-full"
              >
                <div
                  class="w-full rounded-sm transition-opacity hover:opacity-80"
                  :class="bar.value == null || bar.range == null ? 'bg-muted-foreground/30' : TONE_BG[RANGE_TONE[bar.range]]"
                  :style="{ height: bar.value == null ? '4px' : `${Math.max(Math.min(bar.value, 100), 1)}%` }"
                  role="img"
                  :aria-label="barLabel(bar.name, bar.value)"
                />
              </UTooltip>
            </li>
          </ul>

          <div
            class="pointer-events-none absolute inset-x-0 border-t border-dashed border-foreground/50"
            :style="{ bottom: `${load.goal}%` }"
          >
            <span class="absolute -top-4 right-0 text-[11px] text-muted-foreground">
              {{ t('dashboard.load.goal', { goal: load.goal }) }}
            </span>
          </div>
        </div>

        <ul class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          <li
            v-for="item in legend"
            :key="item.range"
            class="inline-flex items-center gap-1.5"
          >
            <span
              class="size-2 rounded-full"
              :class="TONE_BG[item.tone]"
            />
            {{ item.label }}
          </li>
        </ul>
      </template>
    </DashboardBlockState>
  </section>
</template>
