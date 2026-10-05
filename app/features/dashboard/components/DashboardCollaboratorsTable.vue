<script setup lang="ts">
import DashboardDonut from '~/features/dashboard/components/shared/DashboardDonut.vue'
import DashboardTrendLine from '~/features/dashboard/components/shared/DashboardTrendLine.vue'
import type {
  DashboardCollaborator,
  DashboardPendingState,
  DashboardPeriod,
  DashboardTone,
} from '~/features/dashboard/types/dashboard.types'
import { TONE_BG, TONE_SOFT, TONE_TEXT } from '~/features/dashboard/utils/dashboard.util'

/** Rendimiento individual: indicadores, carga, reparto por esfuerzo y tendencia de cada colaborador. */
const props = defineProps<{
  collaborators: DashboardCollaborator[]
}>()

const period = defineModel<DashboardPeriod>('period', { required: true })

const { t } = useI18n()

const periods: DashboardPeriod[] = ['week', 'month', 'quarter', 'year']

/** Meta de carga productiva: marca la línea roja de cada barra de carga ponderada. */
const LOAD_GOAL = 85

const pendingTone: Record<DashboardPendingState, DashboardTone> = {
  available: 'good',
  limit: 'warning',
  saturated: 'danger',
}

const columns = computed(() => [
  { key: 'rank', label: '#', align: 'text-left' },
  { key: 'collaborator', label: t('dashboard.individual.columns.collaborator'), align: 'text-left' },
  { key: 'tct', label: 'TCT', align: 'text-center' },
  { key: 'tc', label: 'TC', align: 'text-center' },
  { key: 'iur', label: 'IUR', align: 'text-center' },
  { key: 'tpr', label: 'TPR', align: 'text-center' },
  { key: 'load', label: t('dashboard.individual.columns.weightedLoad'), align: 'text-left' },
  { key: 'pending', label: t('dashboard.individual.columns.pendingLoad'), align: 'text-left' },
  { key: 'distribution', label: t('dashboard.individual.columns.distribution'), align: 'text-left' },
  { key: 'trend', label: t('dashboard.individual.columns.trend'), align: 'text-left' },
])

const rows = computed(() => props.collaborators)
</script>

<template>
  <section class="rounded-xl border border-border bg-card p-4">
    <header class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {{ t('dashboard.individual.title') }}
      </h2>

      <div class="flex items-center gap-2">
        <UButton
          color="neutral"
          variant="outline"
          size="xs"
          icon="i-lucide-download"
          :label="t('dashboard.individual.excel')"
        />
        <div
          class="inline-flex rounded-md bg-muted p-0.5"
          role="group"
          :aria-label="t('dashboard.individual.periodLabel')"
        >
          <button
            v-for="item in periods"
            :key="item"
            type="button"
            class="rounded px-2.5 py-1 text-[11px] font-medium transition-colors"
            :class="period === item
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'"
            :aria-pressed="period === item"
            @click="period = item"
          >
            {{ t(`dashboard.periods.${item}`) }}
          </button>
        </div>
      </div>
    </header>

    <div class="mt-3 overflow-x-auto">
      <table class="w-full min-w-[980px] border-collapse text-sm">
        <thead>
          <tr class="border-b border-border">
            <th
              v-for="column in columns"
              :key="column.key"
              scope="col"
              class="px-2 pb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
              :class="column.align"
            >
              {{ column.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in rows"
            :key="row.id"
            class="border-b border-border/60 last:border-0"
          >
            <td class="px-2 py-3">
              <span class="inline-flex size-5 items-center justify-center rounded bg-muted font-mono text-[10px] font-semibold text-muted-foreground">
                {{ index + 1 }}
              </span>
            </td>

            <td class="px-2 py-3">
              <div class="flex items-center gap-2.5">
                <span
                  class="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                  :style="{ backgroundColor: row.color }"
                >
                  {{ row.initials }}
                </span>
                <span class="font-semibold text-foreground">{{ row.name }}</span>
              </div>
            </td>

            <td class="px-2 py-3 text-center">
              <span
                class="font-mono text-lg font-bold tabular-nums"
                :class="TONE_TEXT[row.tct.tone]"
              >
                {{ row.tct.value }}
              </span>
            </td>

            <td
              v-for="(metric, metricIndex) in [row.tc, row.iur, row.tpr]"
              :key="`${row.id}-${metricIndex}`"
              class="px-2 py-3 text-center"
            >
              <span
                class="inline-block rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums"
                :class="TONE_SOFT[metric.tone]"
              >
                {{ metric.value }}
              </span>
            </td>

            <td class="px-2 py-3">
              <p
                class="font-mono text-sm font-bold tabular-nums"
                :class="TONE_TEXT[row.load.tone]"
              >
                {{ row.load.percent }}%
              </p>
              <p class="text-[10px] text-muted-foreground">
                {{ row.load.used }}pts/{{ row.load.cap }}pts
              </p>
              <div class="relative mt-1 h-1 w-24 rounded-full bg-muted">
                <div
                  class="h-full rounded-full"
                  :class="TONE_BG[row.load.tone]"
                  :style="{ width: `${Math.min(row.load.percent, 100)}%` }"
                />
                <span
                  class="absolute -top-0.5 h-2 w-px bg-red-600"
                  :style="{ left: `${LOAD_GOAL}%` }"
                />
              </div>
            </td>

            <td class="px-2 py-3">
              <p class="font-mono text-sm tabular-nums">
                <span
                  class="font-bold"
                  :class="TONE_TEXT[pendingTone[row.pending.state]]"
                >{{ row.pending.used }}</span>
                <span class="text-[11px] text-muted-foreground">/{{ row.pending.cap }}pts</span>
              </p>
              <div class="mt-1 h-1 w-24 rounded-full bg-muted">
                <div
                  class="h-full rounded-full"
                  :class="TONE_BG[pendingTone[row.pending.state]]"
                  :style="{ width: `${Math.min((row.pending.used / row.pending.cap) * 100, 100)}%` }"
                />
              </div>
              <span
                class="mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                :class="TONE_SOFT[pendingTone[row.pending.state]]"
              >
                {{ t(`dashboard.individual.pendingState.${row.pending.state}`) }}
              </span>
            </td>

            <td class="px-2 py-3">
              <div class="flex items-center gap-2">
                <DashboardDonut
                  :quick="row.distribution.quick"
                  :normal="row.distribution.normal"
                  :complex="row.distribution.complex"
                />
                <ul class="font-mono text-[10px] leading-tight">
                  <li :class="TONE_TEXT.good">
                    R {{ row.distribution.quick }}
                  </li>
                  <li :class="TONE_TEXT.warning">
                    N {{ row.distribution.normal }}
                  </li>
                  <li :class="TONE_TEXT.danger">
                    C {{ row.distribution.complex }}
                  </li>
                </ul>
              </div>
            </td>

            <td class="px-2 py-3">
              <div class="flex items-center gap-1.5">
                <DashboardTrendLine
                  :series="row.trend.series"
                  :tone="row.trend.tone"
                  :width="44"
                  :height="16"
                />
                <UIcon
                  :name="row.trend.direction === 'up' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'"
                  class="size-3"
                  :class="row.trend.direction === 'up' ? TONE_TEXT.good : TONE_TEXT.danger"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
