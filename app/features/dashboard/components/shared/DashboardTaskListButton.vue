<script setup lang="ts">
import DashboardTaskDetailCard from '~/features/dashboard/components/shared/DashboardTaskDetailCard.vue'
import type { ApiDashboardTask } from '~/features/dashboard/types/dashboard-api.types'

/**
 * Contador de una celda (`5/6`) que al darle clic abre el detalle de las tareas que lo forman. Lo usan los contadores de
 * TCT (tareas que vencen en el periodo) y de TC (tareas que pasaron a En progreso) de Rendimiento individual.
 */
defineProps<{
  /** Texto del contador, p. ej. `5/6`. */
  counter: string
  /** Tareas del detalle (`tct_task` / `tc_task`). */
  tasks: ApiDashboardTask[]
  /** Encabezado del detalle. */
  title: string
  /** Qué tareas son, bajo el encabezado. */
  description: string
  /** Tooltip nativo del contador. */
  hint?: string
  /** Contador sin tareas: se ve más tenue. */
  muted?: boolean
}>()

const { t } = useI18n()
</script>

<template>
  <UPopover
    :content="{ side: 'bottom', align: 'start', sideOffset: 6 }"
    :ui="{ content: 'w-[min(24rem,calc(100vw-1.5rem))] p-0 overflow-hidden' }"
  >
    <button
      type="button"
      class="cursor-pointer rounded-sm font-mono text-[11px] tabular-nums underline decoration-dotted underline-offset-2 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aeto-teal"
      :class="muted ? 'text-muted-foreground/60' : 'text-muted-foreground'"
      :title="hint"
      :aria-label="`${t('dashboard.individual.taskList.open')}: ${counter}`"
    >
      {{ counter }}
    </button>

    <template #content>
      <div class="flex flex-col">
        <header class="border-b border-border px-3 py-2.5">
          <p class="text-sm font-semibold text-foreground">
            {{ title }}
            <span class="font-mono text-xs font-normal text-muted-foreground">· {{ tasks.length }}</span>
          </p>
          <p class="text-xs text-muted-foreground">
            {{ description }}
          </p>
        </header>

        <ul
          v-if="tasks.length"
          class="max-h-96 space-y-2 overflow-y-auto p-3"
        >
          <li
            v-for="task in tasks"
            :key="task.id"
          >
            <DashboardTaskDetailCard :task="task" />
          </li>
        </ul>
        <p
          v-else
          class="px-3 py-6 text-center text-sm text-muted-foreground"
        >
          {{ t('dashboard.individual.taskList.empty') }}
        </p>
      </div>
    </template>
  </UPopover>
</template>
