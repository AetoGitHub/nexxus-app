<script setup lang="ts">
import TaskAssigneeAvatars from '~/features/tasks/components/shared/TaskAssigneeAvatars.vue'
import TaskStatusCircle from '~/features/tasks/components/shared/TaskStatusCircle.vue'
import { QUICK_ADVANCE_KEY } from '~/features/tasks/composables/shared/useQuickAdvanceTask'
import TaskMentionBadge from '~/features/tasks/components/shared/TaskMentionBadge.vue'
import TaskTokenButton from '~/features/tasks/components/shared/TaskTokenButton.vue'
import TaskReviewButton from '~/features/tasks/components/shared/TaskReviewButton.vue'
import TaskReviewChip from '~/features/tasks/components/shared/TaskReviewChip.vue'
import { useTaskMentions } from '~/features/tasks/composables/shared/useTaskMentions'
import { useTaskReviewState } from '~/features/tasks/composables/shared/useTaskReviewState'
import type { Task } from '~/features/tasks/types/task.types'
import TaskQuickDueDateModal from '~/features/tasks/components/shared/TaskQuickDueDateModal.vue'

const props = withDefaults(
  defineProps<{
    task: Task
    columnId: string | number
    selected?: boolean
    dragging?: boolean
    draggable?: boolean
  }>(),
  {
    selected: false,
    dragging: false,
    draggable: true,
  },
)

const emit = defineEmits<{
  select: [taskId: number]
  dragStart: [payload: { taskId: number, columnId: string | number }]
  dragEnd: []
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
const { isReviewed } = useTaskReviewState()
const reviewed = computed(() => isReviewed(props.task))
/** En backlog la marca solo se muestra (ahí no se reordena). */
const reviewReadonly = computed(() => props.task.status === 'backlog' || props.task.backlog === true)

// Solo hay círculo cuando el tablero lo provee (no en Pendientes de aprobación).
const quickAdvance = inject(QUICK_ADVANCE_KEY, null)
const advanceStep = computed(() => quickAdvance?.stepOf(props.task) ?? null)

const didDrag = ref(false)

/** Mover la tarea de columna cambia su estado: solo quien participa en ella puede hacerlo. */
const isDraggable = computed(() => props.draggable && canModifyTask(props.task, user.value?.id))

/** Atajo: clic en la fecha para cambiarla sin abrir la tarea (misma regla que editar). */
const canEditDue = computed(() => canQuickEditDueDate(props.task, user.value?.id))
const dueModalOpen = ref(false)

function openDueModal() {
  dueModalOpen.value = true
}

function onSelect() {
  if (didDrag.value) {
    didDrag.value = false
    return
  }
  emit('select', props.task.id)
}

/**
 * Un toque/clic que empieza en un control de la ficha (`data-no-drag`, p. ej. "Revisada") no debe arrastrarla:
 * el dragstart lo recibe la tarjeta, así que se recuerda dónde empezó el puntero.
 */
const pointerOnControl = ref(false)

function onPointerDownCapture(event: PointerEvent) {
  pointerOnControl.value = event.target instanceof Element && event.target.closest('[data-no-drag]') != null
}

function onDragStart(event: DragEvent) {
  if (!isDraggable.value || pointerOnControl.value) {
    event.preventDefault()
    return
  }
  didDrag.value = true
  if (!event.dataTransfer) {
    return
  }
  event.dataTransfer.setData('application/x-nexxus-task', String(props.task.id))
  event.dataTransfer.setData('application/x-nexxus-from-column', String(props.columnId))
  event.dataTransfer.effectAllowed = 'move'
  emit('dragStart', { taskId: props.task.id, columnId: props.columnId })
}

function onDragEnd() {
  emit('dragEnd')
}
</script>

<template>
  <div
    :draggable="isDraggable"
    :class="[isDraggable ? 'cursor-grab active:cursor-grabbing' : '', dragging ? 'opacity-40' : '']"
    @pointerdown.capture="onPointerDownCapture"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
  >
    <!-- div en vez de button: dentro va el botón de token y un button no puede anidar otro. -->
    <div
      role="button"
      tabindex="0"
      class="relative w-full cursor-pointer text-left rounded-lg border border-border bg-card p-3 shadow-sm hover:border-muted-foreground/50 hover:brightness-110 transition-[filter,border-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 space-y-2"
      :class="[selected ? 'ring-2 ring-aeto-teal/50' : '', mentionsMe ? 'task-mention-me' : '', reviewed ? 'opacity-75' : '']"
      :style="{ borderLeft: `3px solid ${barColor}` }"
      @click="onSelect"
      @keydown.enter.self.prevent="onSelect"
      @keydown.space.self.prevent="onSelect"
    >
      <div class="flex items-start gap-2">
        <TaskStatusCircle
          v-if="quickAdvance"
          class="mt-px"
          :status="task.status"
          :step="advanceStep"
          :blocked="quickAdvance.isBlocked(task)"
          :loading="quickAdvance.isAdvancing(task.id)"
          @advance="quickAdvance.advance(task)"
        />
        <p class="min-w-0 flex-1 text-sm font-medium text-foreground leading-snug line-clamp-2">
          <MentionText :text="task.short_description" />
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-1.5">
        <TaskMentionBadge :mentions="task.mentions" />
        <UBadge
          v-if="projectName"
          :icon="task.is_personal ? 'i-lucide-lock' : 'i-lucide-folder-kanban'"
          :label="projectName"
          color="primary"
          variant="soft"
          size="sm"
          :title="task.is_personal ? t('privateProjects.lockTooltip') : undefined"
          :aria-label="task.is_personal ? `${t('tasks.projectName', { name: projectName })} · ${t('privateProjects.lockAria')}` : t('tasks.projectName', { name: projectName })"
        />
        <UBadge
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
        <TaskReviewChip
          :task-id="task.id"
          :reviewed-at="task.reviewed_at"
        />
        <!-- Oculto de momento: genera confusión
        <UBadge
          v-if="requiresAttention"
          icon="i-lucide-triangle-alert"
          :label="t('tasks.requiresAttention')"
          color="error"
          variant="soft"
          size="sm"
        />
        -->
      </div>

      <!-- min-h-6: misma altura con o sin el botón "Revisada" (backlog), para que la columna no brinque. -->
      <div class="flex min-h-6 items-center justify-between gap-2 pt-1">
        <TaskAssigneeAvatars :assignees="assignees" />
        <div class="ml-auto flex shrink-0 items-center gap-1.5">
          <TaskTokenButton
            :task-id="task.id"
            :count="task.tokens_count"
          />
          <!-- Atajo: cambiar la fecha límite sin abrir la tarea (solo quien puede editarla). -->
          <UTooltip
            v-if="dueLabel && canEditDue"
            :text="t('tasks.quickDue.title')"
          >
            <button
              type="button"
              draggable="false"
              class="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-mono tabular-nums transition-colors hover:bg-muted"
              :class="isOverdue ? 'text-error font-medium' : 'text-muted-foreground hover:text-foreground'"
              :aria-label="t('tasks.quickDue.title')"
              @click.stop="openDueModal"
              @keydown.enter.stop
              @keydown.space.stop
              @mousedown.stop
            >
              <UIcon
                name="i-lucide-calendar"
                class="h-3 w-3"
              />
              {{ dueLabel }}
            </button>
          </UTooltip>
          <span
            v-else-if="dueLabel"
            class="text-[11px] font-mono tabular-nums"
            :class="isOverdue ? 'text-error font-medium' : 'text-muted-foreground'"
          >
            {{ dueLabel }}
          </span>
          <!-- Acción rápida a la derecha; en backlog solo se muestra el chip (ahí no se reordena). -->
          <TaskReviewButton
            v-if="!reviewReadonly"
            :task-id="task.id"
            :reviewed-at="task.reviewed_at"
          />
        </div>
      </div>
    </div>

    <!-- Solo montado mientras se usa: no carga un modal por cada tarjeta. -->
    <TaskQuickDueDateModal
      v-if="dueModalOpen"
      v-model:open="dueModalOpen"
      :task-id="task.id"
      :task-name="task.short_description"
      :current-limit-day="limitDayOf(task)"
    />
  </div>
</template>
