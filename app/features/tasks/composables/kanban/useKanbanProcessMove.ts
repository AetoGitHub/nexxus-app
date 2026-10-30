import type {
  KanbanTaskMove,
  ReturnTaskProcessTarget,
  Task,
} from '~/features/tasks/types/task.types'
import { useTaskProcessActions } from '~/features/tasks/composables/shared/useTaskProcessActions'
import { resolveKanbanProcessMove } from '~/features/tasks/utils/kanban/kanban-process-move.util'

/**
 * Flujo DnD en Kanban All. Avanzar (iniciar, enviar a revisión, completar) se aplica directo, sin modal ni comentario;
 * los regresos (devolver, rechazar, reabrir) abren su modal de confirmación.
 */
export function useKanbanProcessMove(options: { onNeedsEvidence?: (taskId: number) => void } = {}) {
  const toast = useToast()
  const { t } = useI18n()
  const { startTask, closeTask } = useTaskProcessActions(options)

  const pendingTaskId = ref<number | null>(null)
  const reviewDecisionModalOpen = ref(false)
  const reopenProcessModalOpen = ref(false)
  const returnProcessModalOpen = ref(false)
  const returnProcessTarget = ref<ReturnTaskProcessTarget>('backlog')

  /** Tareas con un avance en curso: soltar otra vez la misma tarjeta no lo repite. */
  const advancingIds = new Set<number>()

  function resetModals() {
    pendingTaskId.value = null
    reviewDecisionModalOpen.value = false
    reopenProcessModalOpen.value = false
    returnProcessModalOpen.value = false
  }

  async function advance(task: Task, run: () => Promise<boolean>) {
    if (advancingIds.has(task.id)) {
      return
    }
    advancingIds.add(task.id)
    try {
      await run()
    }
    finally {
      advancingIds.delete(task.id)
    }
  }

  function requestMove(payload: KanbanTaskMove & { task: Task }) {
    const transition = resolveKanbanProcessMove(
      payload.fromColumnId,
      payload.toColumnId,
      payload.task,
    )

    if (!transition) {
      toast.add({
        title: t('tasks.kanban.moveNotAllowedTitle'),
        description: t('tasks.kanban.moveNotAllowedDescription'),
        color: 'warning',
      })
      return false
    }

    const { task } = payload

    if (transition.kind === 'start') {
      void advance(task, () => startTask(task.id))
      return true
    }

    if (transition.kind === 'close') {
      void advance(task, () => closeTask(task.id, transition.status, task.requires_close_file))
      return true
    }

    // Completar desde revisión también avanza directo; rechazar es un regreso y mantiene su modal.
    if (transition.kind === 'review' && transition.status === 'complete') {
      void advance(task, () => closeTask(task.id, 'complete', task.requires_close_file))
      return true
    }

    pendingTaskId.value = payload.taskId

    if (transition.kind === 'reopen') {
      reopenProcessModalOpen.value = true
      return true
    }

    if (transition.kind === 'return') {
      returnProcessTarget.value = transition.target
      returnProcessModalOpen.value = true
      return true
    }

    reviewDecisionModalOpen.value = true
    return true
  }

  function onProcessSuccess() {
    resetModals()
  }

  return {
    pendingTaskId,
    reviewDecisionModalOpen,
    reopenProcessModalOpen,
    returnProcessModalOpen,
    returnProcessTarget,
    requestMove,
    onProcessSuccess,
  }
}
