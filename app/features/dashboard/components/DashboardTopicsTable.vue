<script setup lang="ts">
import DashboardBlockState from '~/features/dashboard/components/shared/DashboardBlockState.vue'
import DashboardTrendLine from '~/features/dashboard/components/shared/DashboardTrendLine.vue'
import type { ApiDirection, ApiProjectsResponse } from '~/features/dashboard/types/dashboard-api.types'
import type { DashboardTone } from '~/features/dashboard/types/dashboard.types'
import { NO_DATA, TONE_SOFT, TONE_TEXT, formatPercent, rangeOf } from '~/features/dashboard/utils/dashboard.util'
import { resolveThemeColor } from '~/features/projects/utils/project-color.util'
import { getInitials } from '~/shared/utils/initials'

/** Rendimiento por tema: cumplimiento, avance, pendientes críticos, miembros y tendencia. */
const props = defineProps<{
  data: ApiProjectsResponse | undefined
  loading: boolean
  refreshing: boolean
  error: string
}>()

defineEmits<{
  retry: []
}>()

const { t } = useI18n()

/** Avatares visibles de la columna Miembros; el resto va como «+N». */
const VISIBLE_MEMBERS = 3

const columns = computed(() => [
  { key: 'topic', label: t('dashboard.topics.columns.topic') },
  { key: 'tct', label: 'TCT' },
  { key: 'completed', label: t('dashboard.topics.columns.completed') },
  { key: 'active', label: t('dashboard.topics.columns.active') },
  { key: 'overdue', label: t('dashboard.topics.columns.overdue') },
  { key: 'urgent', label: t('dashboard.topics.columns.urgent') },
  { key: 'members', label: t('dashboard.topics.columns.members') },
  { key: 'trend', label: t('dashboard.topics.columns.trend') },
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

/** Avance de completadas; sin tareas en el periodo la barra queda vacía (evita dividir entre 0). */
function completedWidth(completed: number, total: number): string {
  return total > 0 ? `${Math.min((completed / total) * 100, 100)}%` : '0%'
}
</script>

<template>
  <section class="rounded-xl border border-border bg-card p-4">
    <h2 class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
      {{ t('dashboard.topics.title') }}
    </h2>

    <DashboardBlockState
      class="mt-3"
      :loading="loading"
      :error="error"
      :empty="rows.length === 0"
      :empty-text="t('dashboard.topics.empty')"
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
              >
                {{ column.label }}
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
                <div class="flex items-center">
                  <span
                    v-for="(member, index) in topic.members.slice(0, VISIBLE_MEMBERS)"
                    :key="`${topic.id}-${member.id}`"
                    class="inline-flex size-6 items-center justify-center rounded-full border-2 border-card bg-muted-foreground/60 text-[9px] font-semibold text-white"
                    :class="index > 0 ? '-ml-1.5' : ''"
                    :title="member.name"
                  >
                    {{ getInitials(member.name) }}
                  </span>
                  <span
                    v-if="topic.members.length > VISIBLE_MEMBERS"
                    class="ml-1.5 text-[10px] text-muted-foreground"
                  >
                    +{{ topic.members.length - VISIBLE_MEMBERS }}
                  </span>
                </div>
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
  </section>
</template>
