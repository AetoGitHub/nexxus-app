<script setup lang="ts">
import type { DashboardCompare, DashboardPeriod } from '~/features/dashboard/types/dashboard.types'

/** Filtros globales del Dashboard: periodo y comparativa. Aplican a los KPI, la carga y los temas. */
const period = defineModel<DashboardPeriod>('period', { required: true })
const compare = defineModel<DashboardCompare>('compare', { required: true })

const { t } = useI18n()

const periods: DashboardPeriod[] = ['week', 'month', 'quarter', 'year']

const compareItems = computed(() =>
  (['none', 'previous', 'last_year'] as const).map(value => ({
    value,
    label: t(`dashboard.toolbar.compare.${value}`),
  })),
)
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <div
      class="inline-flex rounded-lg bg-muted p-0.5"
      role="group"
      :aria-label="t('dashboard.toolbar.periodLabel')"
    >
      <button
        v-for="item in periods"
        :key="item"
        type="button"
        class="rounded-md px-3 py-1 text-xs font-medium transition-colors"
        :class="period === item
          ? 'bg-card text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'"
        :aria-pressed="period === item"
        @click="period = item"
      >
        {{ t(`dashboard.periods.${item}`) }}
      </button>
    </div>

    <USelect
      v-model="compare"
      :items="compareItems"
      value-key="value"
      size="sm"
      icon="i-lucide-git-compare-arrows"
      class="w-60"
      :aria-label="t('dashboard.toolbar.compareLabel')"
    />
  </div>
</template>
