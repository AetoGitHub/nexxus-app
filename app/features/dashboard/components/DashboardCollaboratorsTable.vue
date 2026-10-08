<script setup lang="ts">
import DashboardBlockState from '~/features/dashboard/components/shared/DashboardBlockState.vue'
import DashboardDonut from '~/features/dashboard/components/shared/DashboardDonut.vue'
import DashboardTrendLine from '~/features/dashboard/components/shared/DashboardTrendLine.vue'
import MetricTooltip from '~/features/dashboard/components/shared/MetricTooltip.vue'
import type { ApiDirection, ApiPeopleResponse, ApiPersonRow } from '~/features/dashboard/types/dashboard-api.types'
import type { DashboardTone, MetricKey } from '~/features/dashboard/types/dashboard.types'
import { exportPeopleToExcel } from '~/features/dashboard/utils/dashboard-excel.util'
import {
  LOAD_STATUS_TONE,
  NO_DATA,
  TONE_BG,
  TONE_SOFT,
  TONE_TEXT,
  avatarColor,
  formatHours,
  formatPercent,
  rangeOf,
} from '~/features/dashboard/utils/dashboard.util'
import { getInitials } from '~/shared/utils/initials'

/** Rendimiento individual: indicadores, carga, reparto por esfuerzo y tendencia de cada colaborador. */
const props = defineProps<{
  data: ApiPeopleResponse | undefined
  loading: boolean
  refreshing: boolean
  error: string
}>()

defineEmits<{
  retry: []
}>()

const { t } = useI18n()
const toast = useToast()

/** Meta de carga productiva: marca la línea roja de cada barra de carga ponderada. */
const LOAD_GOAL = 85

/** `metric` es la llave del tooltip: # y Colaborador no miden nada y no llevan. */
const columns = computed<{ key: string, label: string, align: string, metric?: MetricKey }[]>(() => [
  { key: 'rank', label: '#', align: 'text-left' },
  { key: 'collaborator', label: t('dashboard.individual.columns.collaborator'), align: 'text-left' },
  { key: 'tct', label: 'TCT', align: 'text-center', metric: 'tct' },
  { key: 'tc', label: 'TC', align: 'text-center', metric: 'tc' },
  { key: 'iur', label: 'IUR', align: 'text-center', metric: 'iur' },
  { key: 'tpr', label: 'TPR', align: 'text-center', metric: 'tpr' },
  { key: 'completed', label: t('dashboard.individual.columns.completed'), align: 'text-left', metric: 'people_completed' },
  { key: 'load', label: t('dashboard.individual.columns.weightedLoad'), align: 'text-left', metric: 'weighted_load' },
  { key: 'pending', label: t('dashboard.individual.columns.pendingLoad'), align: 'text-left', metric: 'pending_load' },
  { key: 'distribution', label: t('dashboard.individual.columns.distribution'), align: 'text-left', metric: 'distribution' },
  { key: 'trend', label: t('dashboard.individual.columns.trend'), align: 'text-left', metric: 'trend' },
])

const rows = computed(() => props.data?.people ?? [])

/** TC, IUR y TPR: chips con el color de su rango (TPR no tiene semáforo). */
function metricsOf(row: ApiPersonRow): { key: string, text: string, tone: DashboardTone }[] {
  return [
    { key: 'tc', text: formatPercent(row.tc), tone: rangeOf(row.tc) },
    { key: 'iur', text: formatPercent(row.iur), tone: rangeOf(row.iur) },
    { key: 'tpr', text: formatHours(row.tpr), tone: 'neutral' },
  ]
}

/** Avance de completadas; sin tareas en el periodo la barra queda vacía (evita dividir entre 0). */
function completedWidth(completed: number, total: number): string {
  return total > 0 ? `${Math.min((completed / total) * 100, 100)}%` : '0%'
}

const TREND_ICONS: Record<NonNullable<ApiDirection>, string> = {
  up: 'i-lucide-arrow-up',
  down: 'i-lucide-arrow-down',
  flat: 'i-lucide-minus',
}

const TREND_TONES: Record<NonNullable<ApiDirection>, DashboardTone> = {
  up: 'good',
  down: 'danger',
  flat: 'neutral',
}

const exporting = ref(false)

async function exportExcel() {
  if (!props.data || exporting.value) {
    return
  }

  exporting.value = true
  try {
    await exportPeopleToExcel(props.data, t)
  }
  catch {
    toast.add({
      title: t('dashboard.individual.excelError'),
      color: 'error',
    })
  }
  finally {
    exporting.value = false
  }
}
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
          :loading="exporting"
          :disabled="rows.length === 0"
          @click="exportExcel"
        />
      </div>
    </header>

    <DashboardBlockState
      class="mt-3"
      :loading="loading"
      :error="error"
      :empty="rows.length === 0"
      :empty-text="t('dashboard.individual.empty')"
      :refreshing="refreshing"
      @retry="$emit('retry')"
    >
      <template #loading>
        <USkeleton
          v-for="n in 4"
          :key="n"
          class="h-12 w-full rounded-lg"
        />
      </template>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[1080px] border-collapse text-sm">
          <thead>
            <tr class="border-b border-border">
              <th
                v-for="column in columns"
                :key="column.key"
                scope="col"
                class="px-2 pb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                :class="column.align"
              >
                <MetricTooltip
                  v-if="column.metric"
                  :metric="column.metric"
                >
                  {{ column.label }}
                </MetricTooltip>
                <template v-else>
                  {{ column.label }}
                </template>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="row.id"
              class="border-b border-border/60 last:border-0"
            >
              <td class="px-2 py-3">
                <span class="inline-flex size-5 items-center justify-center rounded bg-muted font-mono text-[10px] font-semibold text-muted-foreground">
                  {{ row.position }}
                </span>
              </td>

              <td class="px-2 py-3">
                <div class="flex items-center gap-2.5">
                  <UserAvatar
                    :user-id="row.id"
                    :initials="getInitials(row.name)"
                    :name="row.name"
                    :size="28"
                    :font-size="11"
                    :fallback-color="avatarColor(row.id)"
                  />
                  <span class="font-semibold text-foreground">{{ row.name }}</span>
                </div>
              </td>

              <td class="px-2 py-3 text-center">
                <span
                  class="font-mono text-lg font-bold tabular-nums"
                  :class="row.tct == null ? 'text-muted-foreground' : TONE_TEXT[rangeOf(row.tct)]"
                >
                  {{ formatPercent(row.tct) }}
                </span>
              </td>

              <td
                v-for="metric in metricsOf(row)"
                :key="`${row.id}-${metric.key}`"
                class="px-2 py-3 text-center"
              >
                <span
                  class="inline-block rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums"
                  :class="TONE_SOFT[metric.tone]"
                >
                  {{ metric.text }}
                </span>
              </td>

              <td class="px-2 py-3">
                <div class="h-1 w-20 rounded-full bg-muted">
                  <div
                    class="h-full rounded-full"
                    :style="{
                      width: completedWidth(row.completed, row.total),
                      backgroundColor: avatarColor(row.id),
                    }"
                  />
                </div>
                <p
                  class="mt-0.5 font-mono text-[10px]"
                  :class="row.total > 0 ? 'text-foreground' : 'text-muted-foreground'"
                >
                  {{ row.completed }}/{{ row.total }}
                </p>
              </td>

              <td class="px-2 py-3">
                <p
                  class="font-mono text-sm font-bold tabular-nums"
                  :class="row.weighted_load.percentage == null ? 'text-muted-foreground' : TONE_TEXT[rangeOf(row.weighted_load.percentage)]"
                >
                  {{ formatPercent(row.weighted_load.percentage) }}
                </p>
                <p class="text-[10px] text-muted-foreground">
                  {{ row.weighted_load.points_done }}pts/{{ row.weighted_load.points }}pts
                </p>
                <div class="relative mt-1 h-1 w-24 rounded-full bg-muted">
                  <div
                    v-if="row.weighted_load.percentage != null"
                    class="h-full rounded-full"
                    :class="TONE_BG[rangeOf(row.weighted_load.percentage)]"
                    :style="{ width: `${Math.min(row.weighted_load.percentage, 100)}%` }"
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
                    :class="TONE_TEXT[LOAD_STATUS_TONE[row.pending_load.status]]"
                  >{{ row.pending_load.points }}</span>
                  <span class="text-[11px] text-muted-foreground">/{{ row.pending_load.capacity }}pts</span>
                </p>
                <div class="mt-1 h-1 w-24 rounded-full bg-muted">
                  <div
                    class="h-full rounded-full"
                    :class="TONE_BG[LOAD_STATUS_TONE[row.pending_load.status]]"
                    :style="{ width: `${Math.min(row.pending_load.percentage, 100)}%` }"
                  />
                </div>
                <span
                  class="mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                  :class="TONE_SOFT[LOAD_STATUS_TONE[row.pending_load.status]]"
                >
                  {{ t(`dashboard.individual.pendingState.${row.pending_load.status}`) }}
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
                <div
                  v-if="row.trend.series.some(point => point.value != null)"
                  class="flex items-center gap-1.5"
                >
                  <DashboardTrendLine
                    :series="row.trend.series.map(point => point.value)"
                    :tone="row.trend.direction ? TREND_TONES[row.trend.direction] : 'neutral'"
                    :width="44"
                    :height="16"
                  />
                  <UIcon
                    v-if="row.trend.direction"
                    :name="TREND_ICONS[row.trend.direction]"
                    class="size-3"
                    :class="TONE_TEXT[TREND_TONES[row.trend.direction]]"
                  />
                </div>
                <span
                  v-else
                  class="text-muted-foreground"
                >
                  {{ NO_DATA }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </DashboardBlockState>
  </section>
</template>
