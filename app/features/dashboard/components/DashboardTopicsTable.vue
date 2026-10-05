<script setup lang="ts">
import DashboardTrendLine from '~/features/dashboard/components/shared/DashboardTrendLine.vue'
import type { DashboardTone, DashboardTopic } from '~/features/dashboard/types/dashboard.types'
import { TONE_SOFT, TONE_TEXT } from '~/features/dashboard/utils/dashboard.util'

/** Rendimiento por tema: cumplimiento, avance, pendientes críticos, miembros y tendencia. */
defineProps<{
  topics: DashboardTopic[]
}>()

const { t } = useI18n()

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

/** Vencidas y urgentes: 0 apagado, 1 atención, 2 o más crítico. */
function countTone(value: number): DashboardTone | null {
  if (value <= 0) {
    return null
  }
  return value === 1 ? 'warning' : 'danger'
}
</script>

<template>
  <section class="rounded-xl border border-border bg-card p-4">
    <h2 class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
      {{ t('dashboard.topics.title') }}
    </h2>

    <div class="mt-3 overflow-x-auto">
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
            v-for="topic in topics"
            :key="topic.id"
            class="border-b border-border/60 last:border-0"
          >
            <td class="px-2 py-3">
              <span class="inline-flex items-center gap-2 font-semibold text-foreground">
                <span
                  class="size-2.5 rounded-sm"
                  :style="{ backgroundColor: topic.color }"
                />
                {{ topic.name }}
              </span>
            </td>

            <td class="px-2 py-3">
              <span
                class="font-mono text-lg font-bold tabular-nums"
                :class="TONE_TEXT[topic.tct.tone]"
              >
                {{ topic.tct.value }}
              </span>
            </td>

            <td class="px-2 py-3">
              <div class="h-1 w-20 rounded-full bg-muted">
                <div
                  class="h-full rounded-full"
                  :style="{
                    width: `${(topic.completed.done / topic.completed.total) * 100}%`,
                    backgroundColor: topic.color,
                  }"
                />
              </div>
              <p class="mt-0.5 font-mono text-[10px] text-muted-foreground">
                {{ topic.completed.done }}/{{ topic.completed.total }}
              </p>
            </td>

            <td class="px-2 py-3">
              <span
                class="inline-block rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums"
                :class="TONE_SOFT[topic.active.tone]"
              >
                {{ topic.active.value }}
              </span>
            </td>

            <td class="px-2 py-3">
              <p
                class="font-mono text-sm font-bold tabular-nums"
                :class="countTone(topic.overdue.value) ? TONE_TEXT[countTone(topic.overdue.value)!] : 'text-muted-foreground'"
              >
                {{ topic.overdue.value }}
              </p>
              <p
                v-if="topic.overdue.maxDays"
                class="text-[10px] text-muted-foreground"
              >
                {{ t('dashboard.topics.maxDays', { days: topic.overdue.maxDays }) }}
              </p>
            </td>

            <td class="px-2 py-3">
              <span
                class="font-mono text-sm font-bold tabular-nums"
                :class="countTone(topic.urgent) ? TONE_TEXT[countTone(topic.urgent)!] : 'text-muted-foreground'"
              >
                {{ topic.urgent }}
              </span>
            </td>

            <td class="px-2 py-3">
              <div class="flex items-center">
                <span
                  v-for="(member, index) in topic.members"
                  :key="`${topic.id}-${member}`"
                  class="inline-flex size-6 items-center justify-center rounded-full border-2 border-card bg-muted-foreground/60 text-[9px] font-semibold text-white"
                  :class="index > 0 ? '-ml-1.5' : ''"
                >
                  {{ member }}
                </span>
                <span
                  v-if="topic.extraMembers > 0"
                  class="ml-1.5 text-[10px] text-muted-foreground"
                >
                  +{{ topic.extraMembers }}
                </span>
              </div>
            </td>

            <td class="px-2 py-3">
              <div class="flex items-center gap-1.5">
                <DashboardTrendLine
                  :series="topic.trend.series"
                  :tone="topic.trend.tone"
                  :width="44"
                  :height="16"
                />
                <UIcon
                  :name="topic.trend.direction === 'up' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'"
                  class="size-3"
                  :class="topic.trend.direction === 'up' ? TONE_TEXT.good : TONE_TEXT.danger"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
