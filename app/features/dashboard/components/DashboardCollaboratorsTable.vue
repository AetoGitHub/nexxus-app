<script setup lang="ts">
import DashboardBlockState from '~/features/dashboard/components/shared/DashboardBlockState.vue'
import DashboardPriorityDistribution from '~/features/dashboard/components/shared/DashboardPriorityDistribution.vue'
import DashboardSortButton from '~/features/dashboard/components/shared/DashboardSortButton.vue'
import DashboardTaskListButton from '~/features/dashboard/components/shared/DashboardTaskListButton.vue'
import DashboardTablePagination from '~/features/dashboard/components/shared/DashboardTablePagination.vue'
import DashboardTableSearch from '~/features/dashboard/components/shared/DashboardTableSearch.vue'
import DashboardTrendLine from '~/features/dashboard/components/shared/DashboardTrendLine.vue'
import MetricTooltip from '~/features/dashboard/components/shared/MetricTooltip.vue'
import { dashboardErrorMessage } from '~/features/dashboard/composables/useDashboardApi'
import type { ApiDirection, ApiPeopleExportResponse, ApiPeopleResponse, ApiPersonRow } from '~/features/dashboard/types/dashboard-api.types'
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

/**
 * Rendimiento individual: indicadores, carga, reparto por esfuerzo y tendencia de cada colaborador. La búsqueda, el orden
 * y la página los resuelve el backend (`search`, `ordering`, `page`); esta tabla solo pinta la página que llega.
 */
const props = defineProps<{
  data: ApiPeopleResponse | undefined
  loading: boolean
  refreshing: boolean
  error: string
  /** Pide todas las filas con los filtros y la búsqueda actuales (`export=true`) para el Excel. */
  fetchAll: () => Promise<ApiPeopleExportResponse>
}>()

/** Lo escrito en el buscador (se manda al backend ~300 ms después de dejar de teclear). */
const search = defineModel<string>('search', { required: true })
/** `campo` ascendente o `-campo` descendente (`ordering` del backend). */
const ordering = defineModel<string>('ordering', { required: true })
const page = defineModel<number>('page', { required: true })

defineEmits<{
  retry: []
}>()

const { t } = useI18n()
const toast = useToast()

/** Meta de carga productiva: marca la línea roja de cada barra de carga ponderada. */
const LOAD_GOAL = 85

/**
 * Urgentes resueltas de la persona: el backend manda el IUR (%) y cuántas urgentes tiene en el periodo
 * (`distribution.urgent`, el mismo universo del IUR), así que el conteo sale de ahí.
 */
function urgentResolved(row: ApiPersonRow): number {
  return row.iur == null ? 0 : Math.round((row.iur * row.distribution.urgent) / 100)
}

/** `metric` es la llave del tooltip: # y Colaborador no miden nada y no llevan. */
/**
 * `field` es el `ordering` que acepta el backend (las columnas sin él no se ordenan: #, distribución y tendencia);
 * `ascendingFirst` marca donde menor es mejor (nombre, TPR).
 */
const columns = computed<{ key: string, label: string, align: string, metric?: MetricKey, field?: string, ascendingFirst?: boolean }[]>(() => [
  { key: 'rank', label: '#', align: 'text-left' },
  { key: 'collaborator', label: t('dashboard.individual.columns.collaborator'), align: 'text-left', field: 'name', ascendingFirst: true },
  { key: 'tct', label: 'TCT', align: 'text-center', metric: 'tct', field: 'tct' },
  { key: 'iur', label: 'IUR', align: 'text-center', metric: 'iur', field: 'iur' },
  { key: 'tpr', label: 'TPR', align: 'text-center', metric: 'tpr', field: 'tpr', ascendingFirst: true },
  { key: 'tctDistribution', label: t('dashboard.individual.columns.tctDistribution'), align: 'text-left', metric: 'distribution' },
  { key: 'tc', label: 'TC', align: 'text-center', metric: 'tc_worked', field: 'tc' },
  { key: 'load', label: t('dashboard.individual.columns.weightedLoad'), align: 'text-left', metric: 'weighted_load', field: 'ica' },
  { key: 'pending', label: t('dashboard.individual.columns.pendingLoad'), align: 'text-left', metric: 'pending_load', field: 'pending_load' },
  { key: 'tcDistribution', label: t('dashboard.individual.columns.tcDistribution'), align: 'text-left', metric: 'tc_distribution' },
  { key: 'trend', label: t('dashboard.individual.columns.trend'), align: 'text-left', metric: 'trend' },
])

const rows = computed(() => props.data?.people ?? [])

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

/** `aria-sort` del encabezado según el orden que está activo. */
function ariaSort(field: string | undefined): 'ascending' | 'descending' | 'none' | undefined {
  if (!field) {
    return undefined
  }
  if (ordering.value === field) {
    return 'ascending'
  }
  return ordering.value === `-${field}` ? 'descending' : 'none'
}

/** Sin filas por la búsqueda: lo dice con la palabra buscada; sin búsqueda, el vacío de siempre. */
const emptyText = computed(() => {
  const term = search.value.trim()
  return term
    ? t('dashboard.individual.noResults', { search: term })
    : t('dashboard.individual.empty')
})

const exporting = ref(false)

/**
 * El Excel lleva todas las filas que cumplen los filtros y la búsqueda (no solo la página visible), así que las pide
 * al backend con `export=true`. Si el backend se niega (p. ej. más de 5,000 filas) se muestra su mensaje.
 */
async function exportExcel() {
  if (exporting.value || rows.value.length === 0) {
    return
  }

  exporting.value = true
  try {
    await exportPeopleToExcel(await props.fetchAll(), t)
  }
  catch (error) {
    toast.add({
      title: t('dashboard.individual.excelError'),
      description: dashboardErrorMessage(error),
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

      <div class="flex flex-wrap items-center gap-2">
        <DashboardTableSearch
          v-model="search"
          :placeholder="t('dashboard.individual.searchPlaceholder')"
        />
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
      :empty-text="emptyText"
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
        <table class="w-full min-w-[980px] border-collapse text-sm">
          <thead>
            <tr class="border-b border-border">
              <th
                v-for="column in columns"
                :key="column.key"
                scope="col"
                class="px-2 pb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                :class="column.align"
                :aria-sort="ariaSort(column.field)"
              >
                <span class="inline-flex items-center gap-1">
                  <MetricTooltip
                    v-if="column.metric"
                    :metric="column.metric"
                  >
                    {{ column.label }}
                  </MetricTooltip>
                  <template v-else>
                    {{ column.label }}
                  </template>
                  <DashboardSortButton
                    v-if="column.field"
                    :field="column.field"
                    :ordering="ordering"
                    :label="column.label"
                    :ascending-first="column.ascendingFirst"
                    @sort="ordering = $event"
                  />
                </span>
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
                <span class="inline-flex items-baseline gap-1.5">
                  <span
                    class="font-mono text-lg font-bold tabular-nums"
                    :class="row.tct == null ? 'text-muted-foreground' : TONE_TEXT[rangeOf(row.tct)]"
                  >
                    {{ formatPercent(row.tct) }}
                  </span>
                  <DashboardTaskListButton
                    :counter="`${row.completed}/${row.total}`"
                    :tasks="row.tct_task ?? []"
                    :title="t('dashboard.individual.taskList.tctTitle', { name: row.name })"
                    :description="t('dashboard.individual.taskList.tctDescription')"
                    :hint="t('dashboard.individual.workedCount')"
                    :muted="row.total === 0"
                  />
                </span>
              </td>

              <td class="px-2 py-3 text-center">
                <span class="inline-flex items-baseline gap-1.5">
                  <span
                    class="font-mono text-lg font-bold tabular-nums"
                    :class="row.iur == null ? 'text-muted-foreground' : TONE_TEXT[rangeOf(row.iur)]"
                  >
                    {{ formatPercent(row.iur) }}
                  </span>
                  <span
                    class="font-mono text-[11px] tabular-nums"
                    :class="row.distribution.urgent > 0 ? 'text-muted-foreground' : 'text-muted-foreground/60'"
                    :title="t('dashboard.individual.urgentResolved')"
                  >
                    {{ urgentResolved(row) }}/{{ row.distribution.urgent }}
                  </span>
                </span>
              </td>

              <td class="px-2 py-3 text-center">
                <span
                  class="inline-block rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums"
                  :class="TONE_SOFT.neutral"
                  :title="row.tpr == null ? t('dashboard.kpis.tpr.empty') : undefined"
                >
                  {{ formatHours(row.tpr) }}
                </span>
              </td>

              <td class="px-2 py-3">
                <DashboardPriorityDistribution :distribution="row.distribution" />
              </td>

              <td class="px-2 py-3 text-center">
                <span class="inline-flex items-baseline gap-1.5">
                  <span
                    class="font-mono text-lg font-bold tabular-nums"
                    :class="row.tc == null ? 'text-muted-foreground' : TONE_TEXT[rangeOf(row.tc)]"
                  >
                    {{ formatPercent(row.tc) }}
                  </span>
                  <DashboardTaskListButton
                    :counter="`${row.created_completed}/${row.created}`"
                    :tasks="row.tc_task ?? []"
                    :title="t('dashboard.individual.taskList.tcTitle', { name: row.name })"
                    :description="t('dashboard.individual.taskList.tcDescription')"
                    :hint="t('dashboard.individual.createdCount')"
                    :muted="row.created === 0"
                  />
                </span>
              </td>

              <td class="px-2 py-3">
                <p
                  class="font-mono text-sm font-bold tabular-nums"
                  :class="row.weighted_load.percentage == null ? 'text-muted-foreground' : TONE_TEXT[rangeOf(row.weighted_load.percentage)]"
                >
                  {{ formatPercent(row.weighted_load.percentage) }}
                </p>
                <p class="text-[10px] text-muted-foreground">
                  {{ row.weighted_load.points }}pts/{{ row.weighted_load.capacity }}pts
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
                <DashboardPriorityDistribution :distribution="row.tc_distribution" />
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

    <DashboardTablePagination
      v-model:page="page"
      :pagination="data?.pagination"
      :loading="refreshing"
    />
  </section>
</template>
