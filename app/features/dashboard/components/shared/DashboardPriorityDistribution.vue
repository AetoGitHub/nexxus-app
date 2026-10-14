<script setup lang="ts">
import DashboardDonut from '~/features/dashboard/components/shared/DashboardDonut.vue'
import type { ApiPriorityDistribution } from '~/features/dashboard/types/dashboard-api.types'
import { TONE_TEXT } from '~/features/dashboard/utils/dashboard.util'

/**
 * Reparto de tareas por prioridad: la dona y la lista R / N / A / U (rápidas, normales, altas y urgentes). Lo usan las dos
 * columnas de Distribución de Rendimiento individual: la del TCT (`distribution`, por fecha límite, junto a TPR) y la del TC
 * (`tc_distribution`, las tareas trabajadas en el periodo, que suman el total del TC; antes de Tendencia).
 */
defineProps<{
  distribution: ApiPriorityDistribution
}>()

/** Naranja de las altas (A): el mismo de su segmento en la dona. */
const HIGH_TEXT = 'text-orange-600 dark:text-orange-500'
</script>

<template>
  <div class="flex items-center gap-2">
    <DashboardDonut
      :quick="distribution.quick"
      :normal="distribution.normal"
      :high="distribution.complex"
      :urgent="distribution.urgent"
    />
    <ul class="font-mono text-[10px] leading-tight">
      <li :class="TONE_TEXT.good">
        R {{ distribution.quick }}
      </li>
      <li :class="TONE_TEXT.warning">
        N {{ distribution.normal }}
      </li>
      <li :class="HIGH_TEXT">
        A {{ distribution.complex }}
      </li>
      <li :class="TONE_TEXT.danger">
        U {{ distribution.urgent }}
      </li>
    </ul>
  </div>
</template>
