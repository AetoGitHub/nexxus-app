<script setup lang="ts">
import type { DashboardLoadDistribution, DashboardTone } from '~/features/dashboard/types/dashboard.types'
import { TONE_BG, loadTone } from '~/features/dashboard/utils/dashboard.util'

/** Carga productiva por colaborador contra la meta (barras verticales + línea de meta). */
defineProps<{
  load: DashboardLoadDistribution
}>()

const { t } = useI18n()

const legend: { tone: DashboardTone, key: string }[] = [
  { tone: 'excellent', key: 'excellent' },
  { tone: 'good', key: 'good' },
  { tone: 'warning', key: 'regular' },
  { tone: 'danger', key: 'critical' },
]
</script>

<template>
  <section class="rounded-xl border border-border bg-card p-4">
    <h2 class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
      {{ t('dashboard.load.title') }}
    </h2>

    <div class="mt-3 flex items-center gap-2">
      <h3 class="text-[11px] font-semibold uppercase tracking-wider text-foreground/80">
        {{ t('dashboard.load.productive') }}
      </h3>
      <span class="rounded bg-red-600/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:text-red-400">
        {{ t('dashboard.load.saturated', { count: load.saturatedCount }) }}
      </span>
    </div>

    <div class="relative mt-4 h-28">
      <ul class="flex h-full items-end gap-3">
        <li
          v-for="bar in load.bars"
          :key="bar.id"
          class="min-w-0 flex-1 rounded-sm transition-opacity hover:opacity-80"
          :class="TONE_BG[loadTone(bar.value)]"
          :style="{ height: `${Math.min(bar.value, 100)}%` }"
          :title="`${bar.name}: ${bar.value}%`"
          :aria-label="`${bar.name}: ${bar.value}%`"
        />
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
        :key="item.key"
        class="inline-flex items-center gap-1.5"
      >
        <span
          class="size-2 rounded-full"
          :class="TONE_BG[item.tone]"
        />
        {{ t(`dashboard.load.legend.${item.key}`) }}
      </li>
    </ul>
  </section>
</template>
