<script setup lang="ts">
import DashboardDelta from '~/features/dashboard/components/shared/DashboardDelta.vue'
import DashboardTrendLine from '~/features/dashboard/components/shared/DashboardTrendLine.vue'
import MetricTooltip from '~/features/dashboard/components/shared/MetricTooltip.vue'
import type { DashboardKpi, MetricKey } from '~/features/dashboard/types/dashboard.types'
import { TONE_SOFT, TONE_TEXT } from '~/features/dashboard/utils/dashboard.util'

/** Indicador principal del Dashboard (cumplimiento en tiempo). */
const props = defineProps<{
  kpi: DashboardKpi
}>()

const { t } = useI18n()

const metric = computed(() => props.kpi.key as MetricKey)
</script>

<template>
  <section class="flex items-center justify-between gap-4 rounded-xl border border-border border-t-2 border-t-aeto-teal bg-card px-4 py-3">
    <div class="min-w-0 space-y-1">
      <p class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <MetricTooltip :metric="metric">
          {{ t(`dashboard.kpis.${kpi.key}.label`) }}
        </MetricTooltip>
      </p>
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span
          class="font-mono text-3xl font-bold leading-none tabular-nums"
          :class="TONE_TEXT[kpi.tone]"
        >
          {{ kpi.value }}
        </span>
        <span
          v-if="kpi.badge"
          class="rounded px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap"
          :class="TONE_SOFT[kpi.badge.tone]"
        >
          {{ t(kpi.badge.labelKey, kpi.badge.params ?? {}) }}
        </span>
        <span
          v-if="kpi.delta || kpi.goal != null"
          class="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
        >
          <DashboardDelta
            v-if="kpi.delta"
            :delta="kpi.delta"
          />
          <template v-if="kpi.goal != null">
            <template v-if="kpi.delta">
              ·
            </template>
            {{ t('dashboard.hero.goal', { goal: kpi.goal }) }}
          </template>
        </span>
      </div>
    </div>

    <DashboardTrendLine
      :series="kpi.series"
      :tone="kpi.tone"
      :width="140"
      :height="28"
      class="hidden shrink-0 sm:block"
    />
  </section>
</template>
