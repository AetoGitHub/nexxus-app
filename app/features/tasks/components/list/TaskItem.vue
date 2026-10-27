<script setup lang="ts">
import TaskAssigneeAvatars from '~/features/tasks/components/shared/TaskAssigneeAvatars.vue'
import TaskStatusCircle from '~/features/tasks/components/shared/TaskStatusCircle.vue'
import TaskMentionBadge from '~/features/tasks/components/shared/TaskMentionBadge.vue'
import TaskTokenButton from '~/features/tasks/components/shared/TaskTokenButton.vue'
import { useTaskMentions } from '~/features/tasks/composables/shared/useTaskMentions'
import type { Task } from '~/features/tasks/types/task.types'
import { isQuickAdvanceBlocked, resolveQuickAdvance } from '~/features/tasks/utils/task-quick-advance.util'

const props = withDefaults(
  defineProps<{
    task: Task
    selected?: boolean
    /** Badge de status de la tarea. */
    showStatus?: boolean
    /** Botón de eliminar (hover), p. ej. en la vista de archivadas. */
    deletable?: boolean
    /**
     * Qué hace el círculo: avanzar la tarea al siguiente estado con un clic, sin modal (default; si la tarea no se
     * puede avanzar es solo el indicador de su estado) o autorizarla directamente, sin modal ni slideover
     * (Pendiente de aprobación).
     */
    checkAction?: 'advance' | 'approve'
    /** Spinner en el check mientras se autoriza (solo checkAction="approve"). */
    approveLoading?: boolean
    /** Spinner en el círculo mientras la tarea avanza (solo checkAction="advance"). */
    advancing?: boolean
  }>(),
  {
    selected: false,
    showStatus: false,
    deletable: false,
    checkAction: 'advance',
    approveLoading: false,
    advancing: false,
  },
)

const emit = defineEmits<{
  select: [taskId: number]
  approve: [taskId: number]
  advance: [taskId: number]
  delete: [taskId: number]
}>()

const { t } = useI18n()
const { user } = useAuth()
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
const { mentionsMe } = useTaskMentions(() => props.task.mentions)
const advanceStep = computed(() => props.checkAction === 'advance' ? resolveQuickAdvance(props.task, user.value?.id) : null)
const advanceBlocked = computed(() => props.checkAction === 'advance' && isQuickAdvanceBlocked(props.task, user.value?.id))

/** Eliminar (vista de archivadas) es una modificación: solo para quien participa en la tarea. */
const canDelete = computed(() => props.deletable && canModifyTask(props.task, user.value?.id))

function onSelect() {
  emit('select', props.task.id)
}

function onApproveClick() {
  emit('approve', props.task.id)
}
</script>

<template>
  <div
    role="button"
    tabindex="0"
    class="group relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-lg border border-border bg-card pl-4 pr-3 py-2.5 hover:border-muted-foreground/50 hover:brightness-110 transition-[filter,border-color] cursor-pointer md:flex md:gap-3"
    :class="[mentionsMe ? 'task-mention-me' : '', selected ? 'border-aeto-teal/50' : '']"
    @click="onSelect"
    @keydown.enter.prevent="onSelect"
    @keydown.space.prevent="onSelect"
  >
    <span
      class="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg"
      :style="{ backgroundColor: barColor }"
    />

    <button
      v-if="checkAction === 'approve'"
      type="button"
      class="h-5 w-5 rounded-full border-2 shrink-0 transition-colors flex items-center justify-center border-muted-foreground/40 hover:border-aeto-teal"
      :disabled="approveLoading"
      :aria-label="t('tasks.toUpdate.authorize.submit')"
      @click.stop="onApproveClick"
    >
      <UIcon
        v-if="approveLoading"
        name="i-lucide-loader-circle"
        class="h-3 w-3 animate-spin text-muted-foreground"
      />
    </button>
    <TaskStatusCircle
      v-else
      :status="task.status"
      :step="advanceStep"
      :blocked="advanceBlocked"
      :loading="advancing"
      @advance="emit('advance', task.id)"
    />

    <div class="contents md:flex md:min-w-0 md:flex-1 md:items-center md:gap-2">
      <span
        class="col-start-2 row-start-1 min-w-0 text-sm break-words max-md:line-clamp-2 md:truncate transition-colors"
        :class="task.status === 'complete'
          ? 'text-muted-foreground line-through'
          : 'text-foreground'"
      >
        <MentionText :text="task.short_description" />
      </span>

      <div class="col-start-2 row-start-2 flex min-w-0 flex-wrap items-center gap-1.5 md:shrink-0 md:flex-nowrap">
        <TaskMentionBadge :mentions="task.mentions" />
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
        <TaskTokenButton
          :task-id="task.id"
          :count="task.tokens_count"
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

    <TaskAssigneeAvatars
      class="col-start-3 row-start-2 justify-self-end"
      :assignees="assignees"
    />

    <span
      class="col-start-3 row-start-1 w-16 text-right text-xs font-mono tabular-nums shrink-0"
      :class="isOverdue ? 'text-error font-medium' : 'text-muted-foreground'"
    >
      {{ dueLabel }}
    </span>

    <UTooltip
      v-if="canDelete"
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
