<script setup lang="ts">
import DashboardBlockState from '~/features/dashboard/components/shared/DashboardBlockState.vue'
import DashboardMemberAvatars from '~/features/dashboard/components/shared/DashboardMemberAvatars.vue'
import DashboardSortButton from '~/features/dashboard/components/shared/DashboardSortButton.vue'
import DashboardTablePagination from '~/features/dashboard/components/shared/DashboardTablePagination.vue'
import DashboardTableSearch from '~/features/dashboard/components/shared/DashboardTableSearch.vue'
import DashboardTrendLine from '~/features/dashboard/components/shared/DashboardTrendLine.vue'
import MetricTooltip from '~/features/dashboard/components/shared/MetricTooltip.vue'
import type { ApiDirection, ApiProjectsResponse } from '~/features/dashboard/types/dashboard-api.types'
import type { DashboardTone, MetricKey } from '~/features/dashboard/types/dashboard.types'
import { NO_DATA, TONE_SOFT, TONE_TEXT, formatPercent, rangeOf } from '~/features/dashboard/utils/dashboard.util'
import { resolveThemeColor } from '~/features/projects/utils/project-color.util'

/**
 * Rendimiento por proyecto: cumplimiento, avance, pendientes críticos, miembros y tendencia. La búsqueda, el orden y la
 * página los resuelve el backend (`search`, `ordering`, `page`); esta tabla solo pinta la página que llega.
 */
const props = defineProps<{
  data: ApiProjectsResponse | undefined
  loading: boolean
  refreshing: boolean
  error: string
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

/** Avatares visibles de la columna Miembros; el resto va como «+N». */
const VISIBLE_MEMBERS = 3

/**
 * `metric` es la llave del tooltip: Proyecto no mide nada y no lleva. `field` es el `ordering` que acepta el backend
 * (Miembros y Tendencia no se ordenan); `ascendingFirst` marca donde conviene empezar de menor a mayor (el nombre).
 */
const columns = computed<{ key: string, label: string, metric?: MetricKey, field?: string, ascendingFirst?: boolean }[]>(() => [
  { key: 'topic', label: t('dashboard.topics.columns.topic'), field: 'name', ascendingFirst: true },
  { key: 'tct', label: 'TCT', metric: 'tct', field: 'tct' },
  { key: 'completed', label: t('dashboard.topics.columns.completed'), metric: 'completed', field: 'completed' },
  { key: 'active', label: t('dashboard.topics.columns.active'), metric: 'active', field: 'active' },
  { key: 'overdue', label: t('dashboard.topics.columns.overdue'), metric: 'overdue', field: 'overdue' },
  { key: 'urgent', label: t('dashboard.topics.columns.urgent'), metric: 'urgent', field: 'urgent' },
  { key: 'members', label: t('dashboard.topics.columns.members'), metric: 'members' },
  { key: 'trend', label: t('dashboard.topics.columns.trend'), metric: 'trend' },
])

const rows = computed(() => props.data?.projects ?? [])

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

/** Vencidas y urgentes: 0 apagado (gris), 1 atención, 2 o más crítico. */
function countTone(value: number): DashboardTone | null {
  if (value <= 0) {
    return null
  }
  return value === 1 ? 'warning' : 'danger'
}

function countClass(value: number): string {
  const tone = countTone(value)
  return tone ? TONE_TEXT[tone] : 'text-muted-foreground'
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
    ? t('dashboard.topics.noResults', { search: term })
    : t('dashboard.topics.empty')
})

/** Avance de completadas; sin tareas en el periodo la barra queda vacía (evita dividir entre 0). */
function completedWidth(completed: number, total: number): string {
  return total > 0 ? `${Math.min((completed / total) * 100, 100)}%` : '0%'
}
</script>

<template>
  <section class="rounded-xl border border-border bg-card p-4">
    <header class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {{ t('dashboard.topics.title') }}
      </h2>

      <DashboardTableSearch
        v-model="search"
        :placeholder="t('dashboard.topics.searchPlaceholder')"
      />
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
        <table class="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr class="border-b border-border">
              <th
                v-for="column in columns"
                :key="column.key"
                scope="col"
                class="px-2 pb-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
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
              v-for="topic in rows"
              :key="topic.id"
              class="border-b border-border/60 last:border-0"
            >
              <td class="px-2 py-3">
                <span class="inline-flex items-center gap-2 font-semibold text-foreground">
                  <span
                    class="size-2.5 shrink-0 rounded-sm"
                    :style="{ backgroundColor: resolveThemeColor(topic.color) }"
                  />
                  {{ topic.name }}
                </span>
              </td>

              <td class="px-2 py-3">
                <span
                  class="font-mono text-lg font-bold tabular-nums"
                  :class="topic.tct == null ? 'text-muted-foreground' : TONE_TEXT[rangeOf(topic.tct)]"
                >
                  {{ formatPercent(topic.tct) }}
                </span>
              </td>

              <td class="px-2 py-3">
                <div class="h-1 w-20 rounded-full bg-muted">
                  <div
                    class="h-full rounded-full"
                    :style="{
                      width: completedWidth(topic.completed, topic.total),
                      backgroundColor: resolveThemeColor(topic.color),
                    }"
                  />
                </div>
                <p class="mt-0.5 font-mono text-[10px] text-muted-foreground">
                  {{ topic.completed }}/{{ topic.total }}
                </p>
              </td>

              <td class="px-2 py-3">
                <span
                  class="inline-block rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums"
                  :class="TONE_SOFT[topic.active > 0 ? 'good' : 'neutral']"
                >
                  {{ topic.active }}
                </span>
              </td>

              <td class="px-2 py-3">
                <p
                  class="font-mono text-sm font-bold tabular-nums"
                  :class="countClass(topic.overdue)"
                >
                  {{ topic.overdue }}
                </p>
                <p
                  v-if="topic.max_overdue_days != null"
                  class="text-[10px] text-muted-foreground"
                >
                  {{ t('dashboard.topics.maxDays', { days: topic.max_overdue_days }) }}
                </p>
              </td>

              <td class="px-2 py-3">
                <span
                  class="font-mono text-sm font-bold tabular-nums"
                  :class="countClass(topic.urgent)"
                >
                  {{ topic.urgent }}
                </span>
              </td>

              <td class="px-2 py-3">
                <DashboardMemberAvatars
                  :members="topic.members"
                  :total="topic.members_count"
                  :visible="VISIBLE_MEMBERS"
                />
              </td>

              <td class="px-2 py-3">
                <div
                  v-if="topic.trend.series.some(point => point.value != null)"
                  class="flex items-center gap-1.5"
                >
                  <DashboardTrendLine
                    :series="topic.trend.series.map(point => point.value)"
                    :tone="topic.trend.direction ? TREND_TONES[topic.trend.direction] : 'neutral'"
                    :width="44"
                    :height="16"
                  />
                  <UIcon
                    v-if="topic.trend.direction"
                    :name="TREND_ICONS[topic.trend.direction]"
                    class="size-3"
                    :class="TONE_TEXT[TREND_TONES[topic.trend.direction]]"
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
