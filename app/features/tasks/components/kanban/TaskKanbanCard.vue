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
import TaskQuickDuePopover from '~/features/tasks/components/shared/TaskQuickDuePopover.vue'

const props = withDefaults(
  defineProps<{
    task: Task
    columnId: string | number
    selected?: boolean
    dragging?: boolean
    draggable?: boolean
    /** «Creadas por mí»: sin avance rápido de fase (solo los asignados la mueven) y «Sin asignar» si no tiene asignados. */
    delegated?: boolean
  }>(),
  {
    selected: false,
    dragging: false,
    draggable: true,
    delegated: false,
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
// Mover la tarea (arrastrarla o con el círculo) es editarla: sin `task.can_update` el círculo solo muestra el estatus.
const { can } = usePermissions()
const canMove = computed(() => can('task', 'update'))
const advanceStep = computed(() => (canMove.value ? quickAdvance?.stepOf(props.task) ?? null : null))
const advanceBlocked = computed(() => canMove.value && (quickAdvance?.isBlocked(props.task) ?? false))

const didDrag = ref(false)

/** Mover la tarea de columna cambia su estado: solo quien participa en ella puede hacerlo. */
const isDraggable = computed(() =>
  props.draggable && canMove.value && (props.task.backlog === true || isTaskParticipant(props.task, user.value?.id)),
)

/**
 * Atajo: clic en la fecha para cambiarla sin abrir la tarea (misma regla que editar). En «Creadas por mí» todas son
 * mías (la lista no trae `created_by`), así que también puedo cambiarla mientras siga viva.
 */
const canEditDue = computed(() =>
  // `task.can_update_date`: sin él la fecha solo se muestra y no abre el calendario.
  can('task', 'update_date')
  && (
    canQuickEditDueDate(props.task, user.value?.id)
    || (props.delegated && props.task.status !== 'complete' && props.task.archived !== true && props.task.backlog !== true)
  ),
)

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
    <!-- Tarjeta de la maqueta UX-04: título · 📁 proyecto · [pills] ··· fecha · avatar.
         div en vez de button: dentro van botones (token, fecha, revisada) y un button no puede anidar otro. -->
    <div
      role="button"
      tabindex="0"
      class="relative w-full cursor-pointer text-left rounded-[10px] border border-border bg-card p-3 flex flex-col gap-2.5 text-foreground hover:border-border-strong transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      :class="[selected ? 'ring-2 ring-aeto-teal/50' : '', mentionsMe ? 'task-mention-me' : '', reviewed ? 'opacity-75' : '']"
      @click="onSelect"
      @keydown.enter.self.prevent="onSelect"
      @keydown.space.self.prevent="onSelect"
    >
      <!-- 1. Título (con el círculo de avance rápido cuando el tablero lo ofrece). -->
      <div class="flex items-start gap-2">
        <TaskStatusCircle
          v-if="quickAdvance && !delegated"
          class="mt-px"
          :status="task.status"
          :step="advanceStep"
          :blocked="advanceBlocked"
          :loading="quickAdvance.isAdvancing(task.id)"
          @advance="quickAdvance.advance(task)"
        />
        <p class="min-w-0 flex-1 text-[13px] sm:text-sm font-medium leading-[18px] line-clamp-3">
          <MentionText :text="task.short_description" />
        </p>
      </div>

      <!-- 2. Proyecto: carpeta (o candado si es privado) + nombre, en texto tenue. -->
      <span
        v-if="projectName"
        class="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"
        :title="task.is_personal ? t('privateProjects.lockTooltip') : undefined"
        :aria-label="task.is_personal ? `${t('tasks.projectName', { name: projectName })} · ${t('privateProjects.lockAria')}` : t('tasks.projectName', { name: projectName })"
      >
        <UIcon
          :name="task.is_personal ? 'i-lucide-lock' : 'i-lucide-folder'"
          class="size-3.5 shrink-0"
        />
        <span class="truncate">{{ projectName }}</span>
      </span>

      <!-- 3. Uno tras otro: renglón de pills (si hay) y abajo el renglón de token · fecha · revisar · responsables.
           El estado no va: lo dice la columna. Las pills nunca se parten en dos líneas. -->
      <div class="flex flex-col gap-2 text-xs">
        <div class="flex flex-wrap items-center gap-1 empty:hidden [&>*]:shrink-0 [&>*]:whitespace-nowrap">
          <span
            v-if="priorityMeta"
            class="inline-flex h-[22px] items-center gap-1 rounded-full px-2 font-medium"
            :class="task.priority === 'urgent'
              ? 'bg-danger-soft text-danger'
              : 'bg-warning/15 text-warning-text'"
          >
            <UIcon name="i-lucide-flag" class="size-3 shrink-0" />
            {{ t(priorityMeta.labelKey) }}
          </span>
          <!-- Tipo solo si no es el de siempre (manual). -->
          <span
            v-if="task.type !== 'manual'"
            class="inline-flex h-[22px] items-center gap-1 rounded-full bg-muted px-2 font-medium text-muted-foreground"
            :title="t(typeMeta.labelKey)"
          >
            <UIcon :name="typeMeta.icon" class="size-3 shrink-0" />
            <span class="max-sm:sr-only">{{ t(typeMeta.labelKey) }}</span>
          </span>
          <span
            v-if="closeApprovalsProgress"
            class="inline-flex h-[22px] items-center gap-1 rounded-full bg-warning/15 px-2 font-mono font-medium text-warning-text"
            :aria-label="t('tasks.toUpdate.closeApprovalsProgress', {
              closed: closeApprovalsProgress.closed,
              total: closeApprovalsProgress.total,
            })"
          >
            <UIcon name="i-lucide-check-check" class="size-3 shrink-0" />
            {{ closeApprovalsProgress.closed }}/{{ closeApprovalsProgress.total }}
          </span>
          <TaskMentionBadge :mentions="task.mentions" />
          <TaskReviewChip
            :task-id="task.id"
            :reviewed-at="task.reviewed_at"
            :removable="!reviewReadonly"
          />
        </div>

        <div class="flex min-h-6 items-center gap-1.5">
          <TaskTokenButton
            :task-id="task.id"
            :count="task.tokens_count"
          />
          <!-- Atajo: cambiar la fecha límite sin abrir la tarea (solo quien puede editarla). -->
          <TaskQuickDuePopover
            v-if="dueLabel && canEditDue"
            :task-id="task.id"
            :current-limit-day="limitDayOf(task)"
          >
            <button
              type="button"
              draggable="false"
              data-no-drag
              class="touch-target rounded-md px-1 py-0.5 font-mono tabular-nums transition-colors hover:bg-muted"
              :class="isOverdue ? 'text-danger' : 'text-muted-foreground hover:text-foreground'"
              :title="t('tasks.quickDue.title')"
              :aria-label="`${t('tasks.quickDue.title')}: ${dueLabel}`"
              @click.stop
              @keydown.enter.stop
              @keydown.space.stop
              @mousedown.stop
            >
              {{ dueLabel }}
            </button>
          </TaskQuickDuePopover>
          <span
            v-else-if="dueLabel"
            class="px-1 font-mono tabular-nums"
            :class="isOverdue ? 'text-danger' : 'text-muted-foreground'"
          >
            {{ dueLabel }}
          </span>
          <!-- En backlog solo se muestra el chip «Revisada» (ahí no se reordena). -->
          <TaskReviewButton
            v-if="!reviewReadonly"
            :task-id="task.id"
            :reviewed-at="task.reviewed_at"
          />
          <span class="flex-1" aria-hidden="true" />
          <span
            v-if="delegated && !assignees.length"
            class="inline-flex size-6 items-center justify-center rounded-full bg-input text-muted-foreground"
            :title="t('tasks.kanban.unassigned')"
            :aria-label="t('tasks.kanban.unassigned')"
          >
            <UIcon name="i-lucide-user-x" class="size-3.5" />
          </span>
          <TaskAssigneeAvatars
            v-else
            :assignees="assignees"
            :max="2"
          />
        </div>
      </div>
    </div>

  </div>
</template>
