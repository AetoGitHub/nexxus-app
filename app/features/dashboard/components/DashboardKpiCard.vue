<script setup lang="ts">
import DashboardDelta from '~/features/dashboard/components/shared/DashboardDelta.vue'
import DashboardTrendLine from '~/features/dashboard/components/shared/DashboardTrendLine.vue'
import MetricTooltip from '~/features/dashboard/components/shared/MetricTooltip.vue'
import type { DashboardKpi, MetricKey } from '~/features/dashboard/types/dashboard.types'
import { TONE_SOFT, TONE_TEXT, TONE_TOP_BORDER } from '~/features/dashboard/utils/dashboard.util'

/** Tarjeta de KPI: etiqueta, badge de estado, valor, variación y tendencia. */
const props = defineProps<{
  kpi: DashboardKpi
}>()

const { t } = useI18n()

/** La tarjeta de tareas creadas usa la llave `created` en sus etiquetas y `tasks_created` en el tooltip. */
const metric = computed<MetricKey>(() => (props.kpi.key === 'created' ? 'tasks_created' : props.kpi.key as MetricKey))
</script>

<template>
  <article
    class="flex min-w-0 flex-col gap-2 rounded-xl border border-border border-t-2 bg-card px-3.5 py-3"
    :class="TONE_TOP_BORDER[kpi.tone]"
  >
    <header class="flex items-start justify-between gap-2">
      <p class="min-w-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <MetricTooltip :metric="metric">
          {{ t(`dashboard.kpis.${kpi.key}.label`) }}
        </MetricTooltip>
      </p>
      <span
        v-if="kpi.badge"
        class="max-w-[60%] shrink-0 rounded px-1.5 py-0.5 text-right text-[10px] font-medium leading-tight"
        :class="TONE_SOFT[kpi.badge.tone]"
      >
        {{ t(kpi.badge.labelKey, kpi.badge.params ?? {}) }}
      </span>
    </header>

    <div class="flex items-end justify-between gap-2">
      <p
        class="font-mono text-2xl font-bold leading-none tabular-nums"
        :class="TONE_TEXT[kpi.tone]"
      >
        {{ kpi.value }}
      </p>
      <DashboardDelta
        v-if="kpi.delta"
        :delta="kpi.delta"
      />
    </div>

    <p
      v-if="kpi.detail"
      class="-mt-1 font-mono text-[11px] tabular-nums text-muted-foreground"
    >
      {{ t(kpi.detail.labelKey, kpi.detail.params) }}
    </p>

    <DashboardTrendLine
      v-if="kpi.series.length"
      :series="kpi.series"
      :tone="kpi.tone"
      :height="20"
      class="w-full"
    />
  </article>
</template>
