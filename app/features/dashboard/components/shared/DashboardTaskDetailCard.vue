<script setup lang="ts">
import type { ApiDashboardTask, ApiTaskPriority, ApiTaskStatus } from '~/features/dashboard/types/dashboard-api.types'
import { taskPriorityBarColor } from '~/features/tasks/utils/task-format.util'

/**
 * Tarjeta de una tarea del detalle de TCT / TC (`tct_task` / `tc_task`). Mismo aspecto que la tarjeta del Kanban
 * (barra de color a la izquierda, nombre, proyecto y fechas), pero solo con lo que manda el endpoint: id, nombre
 * (`short_description`), proyecto, prioridad, estatus, fecha de inicio y fecha límite.
 */
const props = defineProps<{
  task: ApiDashboardTask
}>()

const { t, locale } = useI18n()

type BadgeColor = 'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'error'

/** Prioridad: rápida (`low`), normal, alta, urgente y crítica. */
const PRIORITY_COLOR: Record<ApiTaskPriority, BadgeColor> = {
  low: 'neutral',
  normal: 'info',
  high: 'warning',
  urgent: 'error',
  critical: 'error',
}

/** Mismos colores de estatus que el Kanban (más la reabierta, que no tiene columna propia). */
const STATUS_COLOR: Record<ApiTaskStatus, BadgeColor> = {
  backlog: 'neutral',
  pending: 'warning',
  wip: 'primary',
  in_review: 'warning',
  rejected: 'error',
  complete: 'success',
  reopened: 'warning',
}

/** Barra a la izquierda: el color de la prioridad, como en el Kanban. */
const barColor = computed(() => taskPriorityBarColor(props.task.priority))

const priorityLabel = computed(() => (
  props.task.priority in PRIORITY_COLOR ? t(`dashboard.individual.taskList.priorities.${props.task.priority}`) : ''
))
const statusLabel = computed(() => (
  props.task.status in STATUS_COLOR ? t(`dashboard.individual.taskList.statuses.${props.task.status}`) : ''
))

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
    :style="{ borderLeft: `3px solid ${barColor}` }"
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
      <UBadge
        v-if="statusLabel"
        :label="statusLabel"
        :color="STATUS_COLOR[task.status]"
        variant="soft"
        size="sm"
      />
      <UBadge
        v-if="priorityLabel"
        :label="priorityLabel"
        :color="PRIORITY_COLOR[task.priority]"
        variant="soft"
        size="sm"
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
