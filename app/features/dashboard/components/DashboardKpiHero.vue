<script setup lang="ts">
import DashboardDelta from '~/features/dashboard/components/shared/DashboardDelta.vue'
import DashboardTrendLine from '~/features/dashboard/components/shared/DashboardTrendLine.vue'
import type { DashboardKpi } from '~/features/dashboard/types/dashboard.types'
import { TONE_SOFT, TONE_TEXT } from '~/features/dashboard/utils/dashboard.util'

/** Indicador principal del Dashboard (cumplimiento en tiempo). */
defineProps<{
  kpi: DashboardKpi
}>()

const { t } = useI18n()
</script>

<template>
  <section class="flex items-center justify-between gap-4 rounded-xl border border-border border-t-2 border-t-aeto-teal bg-card px-4 py-3">
    <div class="min-w-0 space-y-1">
      <p class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {{ t(`dashboard.kpis.${kpi.key}.label`) }}
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
        <span class="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <DashboardDelta :delta="kpi.delta" />
          <template v-if="kpi.note">
            · {{ kpi.note }}
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
