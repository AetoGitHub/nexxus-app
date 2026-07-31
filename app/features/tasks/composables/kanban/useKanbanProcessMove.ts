import type {
  CloseTaskProcessStatus,
  KanbanTaskMove,
  ReviewDecisionStatus,
  Task,
} from '~/features/tasks/types/task.types'
import { resolveKanbanProcessMove } from '~/features/tasks/utils/kanban/kanban-process-move.util'

/**
 * Estado del flujo DnD → modal de proceso en Kanban All.
 */
export function useKanbanProcessMove() {
  const toast = useToast()
  const { t } = useI18n()

  const pendingTaskId = ref<number | null>(null)
  const startProcessModalOpen = ref(false)
  const closeProcessModalOpen = ref(false)
  const closeProcessStatus = ref<CloseTaskProcessStatus>('in_review')
  const reviewDecisionModalOpen = ref(false)
  const reviewDecisionStatus = ref<ReviewDecisionStatus>('complete')
  const reopenProcessModalOpen = ref(false)

  function resetModals() {
    pendingTaskId.value = null
    startProcessModalOpen.value = false
    closeProcessModalOpen.value = false
    reviewDecisionModalOpen.value = false
    reopenProcessModalOpen.value = false
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

    pendingTaskId.value = payload.taskId

    if (transition.kind === 'start') {
      startProcessModalOpen.value = true
      return true
    }

    if (transition.kind === 'close') {
      closeProcessStatus.value = transition.status
      closeProcessModalOpen.value = true
      return true
    }

    if (transition.kind === 'reopen') {
      reopenProcessModalOpen.value = true
      return true
    }

    reviewDecisionStatus.value = transition.status
    reviewDecisionModalOpen.value = true
    return true
  }

  function onProcessSuccess() {
    resetModals()
  }

  return {
    pendingTaskId,
    startProcessModalOpen,
    closeProcessModalOpen,
    closeProcessStatus,
    reviewDecisionModalOpen,
    reviewDecisionStatus,
    reopenProcessModalOpen,
    requestMove,
    onProcessSuccess,
  }
}
