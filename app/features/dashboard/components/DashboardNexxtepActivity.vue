<script setup lang="ts">
import DashboardKpiCard from '~/features/dashboard/components/DashboardKpiCard.vue'
import type {
  DashboardExecutiveStatus,
  DashboardNexxtep,
  DashboardNexxtepTile,
  DashboardTone,
} from '~/features/dashboard/types/dashboard.types'
import { TONE_BG, TONE_SOFT, TONE_TEXT } from '~/features/dashboard/utils/dashboard.util'

/** Actividad de los ejecutivos virtuales de Nexxtep: indicadores, resumen en vivo y detalle por ejecutivo. */
defineProps<{
  nexxtep: DashboardNexxtep
}>()

const { t } = useI18n()

const tileIcons: Record<DashboardNexxtepTile['key'], string> = {
  active: 'i-lucide-activity',
  waiting: 'i-lucide-clock',
  escalated: 'i-lucide-triangle-alert',
  autonomous: 'i-lucide-check-check',
}

const statusTone: Record<DashboardExecutiveStatus, DashboardTone> = {
  managing: 'good',
  waiting: 'warning',
  escalated: 'danger',
}

const columns = computed(() => [
  { key: 'executive', label: t('dashboard.nexxtep.columns.executive') },
  { key: 'managements', label: t('dashboard.nexxtep.columns.managements') },
  { key: 'messages', label: t('dashboard.nexxtep.columns.messages') },
  { key: 'appointments', label: t('dashboard.nexxtep.columns.appointments') },
  { key: 'evidences', label: t('dashboard.nexxtep.columns.evidences') },
  { key: 'autonomousRate', label: t('dashboard.nexxtep.columns.autonomousRate') },
  { key: 'closeTime', label: t('dashboard.nexxtep.columns.closeTime') },
  { key: 'status', label: t('dashboard.nexxtep.columns.status') },
])
</script>

<template>
  <section class="rounded-xl border border-border bg-card p-4">
    <h2 class="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
      <UIcon
        name="i-lucide-bot"
        class="size-3.5"
      />
      {{ t('dashboard.nexxtep.title') }}
    </h2>

    <div class="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <DashboardKpiCard
        v-for="kpi in nexxtep.kpis"
        :key="kpi.key"
        :kpi="kpi"
        label-prefix="dashboard.nexxtep.kpis"
        compact
      />
    </div>

    <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <article
        v-for="tile in nexxtep.tiles"
        :key="tile.key"
        class="flex items-center gap-3 rounded-xl border border-border px-3.5 py-3"
      >
        <span
          class="inline-flex size-10 shrink-0 items-center justify-center rounded-lg"
          :class="TONE_SOFT[tile.tone]"
        >
          <UIcon
            :name="tileIcons[tile.key]"
            class="size-5"
          />
        </span>
        <div class="min-w-0">
          <p
            class="font-mono text-xl font-bold leading-none tabular-nums"
            :class="TONE_TEXT[tile.tone]"
          >
            {{ tile.value }}
          </p>
          <p class="mt-1 truncate text-[11px] text-muted-foreground">
            {{ t(`dashboard.nexxtep.tiles.${tile.key}`) }}
          </p>
        </div>
      </article>
    </div>

    <h3 class="mt-4 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
      {{ t('dashboard.nexxtep.byExecutive') }}
    </h3>

    <div class="mt-2 overflow-x-auto">
      <table class="w-full min-w-[820px] border-collapse text-sm">
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
            v-for="executive in nexxtep.executives"
            :key="executive.id"
            class="border-b border-border/60 last:border-0"
          >
            <td class="px-2 py-3">
              <div class="flex items-center gap-2.5">
                <span class="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-aeto-teal/15 text-aeto-teal-dark">
                  <UIcon
                    name="i-lucide-bot"
                    class="size-4"
                  />
                </span>
                <div class="min-w-0">
                  <p class="truncate text-[13px] font-semibold text-foreground">
                    {{ executive.name }}
                  </p>
                  <p class="truncate text-[10px] text-muted-foreground">
                    {{ executive.owner }}
                  </p>
                </div>
              </div>
            </td>

            <td class="px-2 py-3">
              <span
                class="font-mono text-base font-bold tabular-nums"
                :class="TONE_TEXT.good"
              >
                {{ executive.managements }}
              </span>
            </td>

            <td
              v-for="(count, countIndex) in [executive.messages, executive.appointments, executive.evidences]"
              :key="`${executive.id}-${countIndex}`"
              class="px-2 py-3"
            >
              <span class="inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">
                {{ count }}
              </span>
            </td>

            <td class="px-2 py-3">
              <p
                class="font-mono text-[11px] font-semibold tabular-nums"
                :class="TONE_TEXT[executive.autonomousRate.tone]"
              >
                {{ executive.autonomousRate.value }}
              </p>
              <div class="mt-0.5 h-1 w-16 rounded-full bg-muted">
                <div
                  class="h-full rounded-full"
                  :class="TONE_BG[executive.autonomousRate.tone]"
                  :style="{ width: executive.autonomousRate.value }"
                />
              </div>
            </td>

            <td class="px-2 py-3">
              <span
                class="inline-block rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums"
                :class="TONE_SOFT[executive.closeTime.tone]"
              >
                {{ executive.closeTime.value }}
              </span>
            </td>

            <td class="px-2 py-3">
              <span class="inline-flex items-center gap-1.5 text-[12px] text-foreground">
                <span
                  class="size-1.5 rounded-full"
                  :class="TONE_BG[statusTone[executive.status]]"
                />
                {{ t(`dashboard.nexxtep.status.${executive.status}`) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
