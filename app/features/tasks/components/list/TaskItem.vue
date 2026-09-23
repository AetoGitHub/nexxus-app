<script setup lang="ts">
import TaskAssigneeAvatars from '~/features/tasks/components/shared/TaskAssigneeAvatars.vue'
import type { Task } from '~/features/tasks/types/task.types'

const props = withDefaults(
  defineProps<{
    task: Task
    selected?: boolean
    /** Badge de status de la tarea. */
    showStatus?: boolean
    /** Botón de eliminar (hover), p. ej. en la vista de archivadas. */
    deletable?: boolean
    /**
     * Qué hace el círculo de check: abrir el detalle (default) o autorizar
     * la tarea directamente, sin modal ni slideover (Pendiente de aprobación).
     */
    checkAction?: 'select' | 'approve'
    /** Spinner en el check mientras se autoriza (solo checkAction="approve"). */
    approveLoading?: boolean
  }>(),
  {
    selected: false,
    showStatus: false,
    deletable: false,
    checkAction: 'select',
    approveLoading: false,
  },
)

const emit = defineEmits<{
  select: [taskId: number]
  approve: [taskId: number]
  delete: [taskId: number]
}>()

const { t } = useI18n()
const {
  typeMeta,
  priorityMeta,
  statusMeta,
  barColor,
  // requiresAttention, // oculto de momento: genera confusión
  closeApprovalsProgress,
  assignees,
  projectName,
  isOverdue,
  dueLabel,
} = useTaskCardPresentation(() => props.task)

function onSelect() {
  emit('select', props.task.id)
}

function onCheckClick() {
  if (props.checkAction === 'approve') {
    emit('approve', props.task.id)
    return
  }
  onSelect()
}
</script>

<template>
  <div
    role="button"
    tabindex="0"
    class="group relative flex items-center gap-3 rounded-lg border border-border bg-card pl-4 pr-3 py-2.5 hover:border-muted-foreground/50 hover:brightness-110 transition-[filter,border-color] cursor-pointer"
    @click="onSelect"
    @keydown.enter.prevent="onSelect"
    @keydown.space.prevent="onSelect"
  >
    <span
      class="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg"
      :style="{ backgroundColor: barColor }"
    />

    <button
      type="button"
      class="h-5 w-5 rounded-full border-2 shrink-0 transition-colors flex items-center justify-center"
      :class="checkAction === 'select' && selected
        ? 'border-aeto-teal bg-aeto-teal text-white'
        : 'border-muted-foreground/40 hover:border-aeto-teal'"
      :disabled="checkAction === 'approve' && approveLoading"
      :aria-label="checkAction === 'approve' ? t('tasks.toUpdate.authorize.submit') : t('tasks.complete')"
      :aria-pressed="checkAction === 'select' && selected"
      @click.stop="onCheckClick"
    >
      <UIcon
        v-if="checkAction === 'approve' && approveLoading"
        name="i-lucide-loader-circle"
        class="h-3 w-3 animate-spin text-muted-foreground"
      />
      <UIcon
        v-else-if="checkAction === 'select' && selected"
        name="i-lucide-check"
        class="h-3 w-3"
      />
    </button>

    <div class="min-w-0 flex-1 flex items-center gap-2">
      <span
        class="min-w-0 text-sm truncate transition-colors"
        :class="selected
          ? 'text-muted-foreground line-through'
          : 'text-foreground'"
      >
        {{ task.short_description }}
      </span>

      <div class="flex items-center gap-1.5 shrink-0">
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
          v-if="showStatus"
          :label="t(statusMeta.labelKey)"
          :color="statusMeta.color"
          variant="soft"
          size="sm"
        />
        <UBadge
          :icon="typeMeta.icon"
          :label="t(typeMeta.labelKey)"
          :color="typeMeta.color"
          variant="soft"
          size="sm"
        />
        <UBadge
          v-if="priorityMeta"
          :label="t(priorityMeta.labelKey)"
          :color="priorityMeta.color"
          variant="soft"
          size="sm"
        />
        <UBadge
          v-if="closeApprovalsProgress"
          :label="`${closeApprovalsProgress.closed}/${closeApprovalsProgress.total}`"
          color="warning"
          variant="soft"
          size="sm"
          :aria-label="t('tasks.toUpdate.closeApprovalsProgress', {
            closed: closeApprovalsProgress.closed,
            total: closeApprovalsProgress.total,
          })"
        />
        <!-- Oculto de momento: genera confusión
        <UBadge
          v-if="requiresAttention"
          icon="i-lucide-triangle-alert"
          :label="t('tasks.requiresAttention')"
          color="error"
          variant="soft"
          size="sm"
          class="hidden lg:inline-flex"
        />
        -->
      </div>
    </div>

    <TaskAssigneeAvatars :assignees="assignees" />

    <span
      class="w-16 text-right text-xs font-mono tabular-nums shrink-0"
      :class="isOverdue ? 'text-error font-medium' : 'text-muted-foreground'"
    >
      {{ dueLabel }}
    </span>

    <UTooltip
      v-if="deletable"
      :text="t('tasks.processDelete.submit')"
    >
      <UButton
        icon="i-lucide-trash-2"
        color="neutral"
        variant="ghost"
        size="xs"
        square
        class="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        :aria-label="t('tasks.processDelete.submit')"
        @click.stop="emit('delete', task.id)"
      />
    </UTooltip>
  </div>
</template>
