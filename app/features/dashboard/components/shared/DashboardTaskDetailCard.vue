<script setup lang="ts">
import type { ApiDashboardTask } from '~/features/dashboard/types/dashboard-api.types'

/**
 * Tarjeta de una tarea del detalle de TCT / TC (`tct_task` / `tc_task`). Mismo aspecto que la tarjeta del Kanban
 * (barra de color a la izquierda, nombre, proyecto y fechas), pero solo con lo que manda el endpoint: id, nombre
 * (`short_description`), proyecto, fecha de inicio y fecha límite.
 */
const props = defineProps<{
  task: ApiDashboardTask
}>()

const { t, locale } = useI18n()

/** Mismo verde que la barra de las tarjetas del Kanban sin color de proyecto. */
const BAR_COLOR = '#28ceab'

const projectName = computed(() => props.task.project?.name?.trim() ?? '')

function formatDate(value: string | null | undefined, withTime: boolean): string {
  if (!value) {
    return t('dashboard.individual.taskList.noDate')
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return t('dashboard.individual.taskList.noDate')
  }
  return new Intl.DateTimeFormat(locale.value, withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }).format(date)
}

const startLabel = computed(() => formatDate(props.task.start_date, true))
const dueLabel = computed(() => formatDate(props.task.limit_date, false))
</script>

<template>
  <div
    class="w-full space-y-2 rounded-lg border border-border bg-card p-3 text-left shadow-sm"
    :style="{ borderLeft: `3px solid ${BAR_COLOR}` }"
  >
    <p class="text-sm font-medium leading-snug text-foreground line-clamp-2">
      {{ task.short_description }}
    </p>

    <div class="flex flex-wrap items-center gap-1.5">
      <UBadge
        v-if="projectName"
        icon="i-lucide-folder-kanban"
        :label="projectName"
        color="primary"
        variant="soft"
        size="sm"
        :aria-label="t('tasks.projectName', { name: projectName })"
      />
      <span class="font-mono text-[11px] tabular-nums text-muted-foreground">#{{ task.id }}</span>
    </div>

    <dl class="grid grid-cols-2 gap-2 pt-1 text-[11px]">
      <div>
        <dt class="text-muted-foreground">
          {{ t('dashboard.individual.taskList.start') }}
        </dt>
        <dd class="font-mono tabular-nums text-foreground">
          {{ startLabel }}
        </dd>
      </div>
      <div>
        <dt class="text-muted-foreground">
          {{ t('dashboard.individual.taskList.due') }}
        </dt>
        <dd class="font-mono tabular-nums text-foreground">
          {{ dueLabel }}
        </dd>
      </div>
    </dl>
  </div>
</template>
